# Observabilité

**Statut** : proposé  
**Date** : 2026-09-04  
**Portée** : tous les projets — existants et greenfield, front et back.

## Context and Problem Statement

L'agence n'a pas de stratégie d'observabilité. Ce qui existe s'est construit par accumulation :

| Couche | Ce qu'on a | Ce qui manque |
|---|---|---|
| **Back** | Crash → pm2 restart → mail (avec throttle) | Logs structurés, métriques, alerting configurable |
| **Front** | Rien | Tout — un écran blanc est invisible |
| **Infra OVH** | Métriques de base via le panel | Pas d'alerting, pas de corrélation applicative |
| **Infra bare metal** | Rien | Tout |

Le passage du front en SPA React aggrave le problème : les erreurs se produisent dans le navigateur, hors de portée du crash → mail.

**Hors périmètre** : les logs d'audit (conformité), l'analytics d'usage (produit).

### Ce qu'on veut observer

Quatre piliers, par ordre de priorité :

**1. Erreurs** (critique) — capturer les exceptions front (JS, réseau) et back (exceptions, rejets de promesse, erreurs services tiers — API partenaires, SMTP, stockage). Avec : source maps résolues, déduplication, breadcrumbs, corrélation front/back, suivi par release.

**2. Logs structurés** (haute) — format JSON avec attributs standardisés (`level`, `timestamp`, `service`, `version`, `env`, `requestId`, `httpStatus`, `userId`, `duration`). Centralisés, cherchables, rétention 7-15 jours en prod / 3 jours en staging. Pas de données sensibles.

Ce qu'on logue : requêtes HTTP, erreurs applicatives, requêtes SQL lentes, démarrage/arrêt du service, événements métier significatifs, appels services tiers.

**3. Métriques et dashboards** (haute) — temps de réponse par route (P50/P95/P99), taux d'erreur HTTP par route, requêtes SQL lentes, Web Vitals front (LCP, CLS, INP — sites grand public uniquement), uptime. La plateforme doit aussi permettre des métriques métier custom (compteurs, histogrammes) — le contenu varie par projet. Métriques infra (CPU, RAM, disque) en nice-to-have, surtout pour le bare metal.

**4. Alerting** (haute) — par seuil, pas unitaire. Pic d'erreurs, régression de performance, service down, nouvelle erreur critique. Canaux : Teams (principal) + mail (backup). Configurable par projet.

### Ce qui change dans le code (indépendant de l'outil)

| Évolution | Effort |
|---|---|
| Logger structuré JSON (remplace `console.log`) — module dans `@igojs/server` | Faible |
| `reportError()` front — une fonction, un fichier | Faible |
| Error Boundary racine React | Faible |
| Gestion explicite des états loading/error/data dans les sections front | Convention |
| Centralisation des logs HTTP (nginx/LB existants, ou middleware applicatif si corrélation fine) | Faible à moyen |
| Suppression progressive du crash → mail | Moyen |

## Considered Options

### A. Sentry (Team)

Plateforme spécialisée error tracking + performance monitoring. ~26 $/mois (plan Team, 50k erreurs, utilisateurs illimités). Free tier : 5k erreurs/mois, 1 utilisateur.

| Pilier | Couverture |
|---|---|
| Erreurs | **OUI** — best-in-class. Source maps, dédup, breadcrumbs, release tracking, corrélation front/back. SDK Express + React en ~25 lignes. |
| Logs | **OUI** — GA depuis sept. 2025. 5 GB inclus, $0.50/GB au-delà. Rétention 14 jours (Team). Liés aux traces. |
| Métriques | **OUI** — custom metrics (compteurs, gauges, distributions), APM par route (P50/P95). |
| Alerting Teams | **OUI** — intégration native (app Teams, pas webhook). Assign/resolve depuis Teams. |
| Infra bare metal | **NON** — pas de monitoring CPU/RAM/disque. |
| Services managés (MySQL, Redis OVH) | **NON** — Sentry est strictement applicatif. Pas de métriques DB, pas de métriques Redis. |
| Métriques métier | **PARTIEL** — custom metrics disponibles mais pas de dashboarding flexible type Grafana. |
| Web Vitals | **OUI** — LCP/CLS/INP automatiques via browserTracingIntegration. |

- Bon : **setup le plus simple.** `Sentry.init()` côté back et front, c'est prêt.
- Bon : **error tracking sans équivalent.** Dédup, breadcrumbs, release tracking, session replay — aucun concurrent ne fait aussi bien sur les erreurs.
- Bon : **logs + métriques couverts** depuis 2025, ce qui n'était pas le cas avant.
- Bon : **coût prévisible et modeste** — ~26-50 $/mois pour notre usage.
- Mauvais : **pas de monitoring infra ni de services managés.** Le bare metal, le MySQL et le Redis OVH restent sans rien. Sentry ne voit que ce que le code applicatif voit.
- Mauvais : **dashboarding limité** par rapport à Grafana — pas de PromQL, pas de dashboards custom avancés.

### B. Grafana Cloud

Plateforme complète : logs (Loki), métriques (Prometheus/Mimir), dashboards, infra, et erreurs (Faro + Loki). Free tier généreux : 10k séries métriques, 50 GB logs, 50 GB traces, 3 utilisateurs, 14 jours de rétention.

| Pilier | Couverture |
|---|---|
| Erreurs | **PARTIEL** — Grafana Faro capture les erreurs front avec source maps. Mais pas de dédup automatique, pas d'inbox "issues", pas de session replay, pas de release tracking. Les erreurs back remontent via les logs (Loki) et les traces (Tempo) — il faut les chercher, elles ne remontent pas toutes seules. |
| Logs | **OUI** — Loki, JSON natif, LogQL. Moins puissant qu'Elasticsearch pour la recherche full-text, mais largement suffisant pour des logs structurés. |
| Métriques | **OUI** — Prometheus/Mimir, PromQL, dashboards Grafana. Best-in-class pour le dashboarding custom. |
| Alerting Teams | **OUI** — intégration webhook Teams, acknowledge/resolve depuis Teams. |
| Infra bare metal | **OUI** — Grafana Alloy (un seul binaire par serveur, remplace node_exporter + Promtail). |
| Services managés (MySQL, Redis OVH) | **OUI** — 150+ intégrations. MySQL (80+ métriques, dashboards pré-construits), Redis, PostgreSQL. Connexion directe aux endpoints OVH via Alloy. Pas d'intégration OVH dédiée, mais les intégrations standard fonctionnent. |
| Métriques métier | **OUI** — compteurs Prometheus custom, dashboards Grafana dédiés. |
| Web Vitals | **OUI** — Grafana Faro, LCP/CLS/INP automatiques. |

- Bon : **une seule plateforme** pour tout — pas deux outils à maintenir, un seul endroit pour l'alerting.
- Bon : **couvre les 4 piliers**, y compris l'infra bare metal et les services managés OVH.
- Bon : **150+ intégrations** — MySQL, Redis, PostgreSQL avec dashboards et alertes pré-configurés. Les services managés OVH sont monitorés via leurs endpoints standard.
- Bon : **free tier généreux** — probablement 0-30 $/mois pour notre volume.
- Bon : **dashboarding sans limite.** Grafana est la référence pour les dashboards custom et les métriques métier.
- Bon : **self-hostable** si besoin (LGTM stack open source).
- Bon : **Alloy** résout le bare metal en un seul agent (métriques + logs).
- Mauvais : **error tracking moins riche que Sentry.** Pas de dédup, pas d'inbox, pas de session replay. On voit les erreurs dans les logs, mais il faut les chercher — pas d'alerte "nouvelle erreur jamais vue" sans config manuelle.
- Mauvais : **setup plus complexe.** OpenTelemetry pour le back, Faro pour le front, Alloy sur chaque serveur, PromQL/LogQL à apprendre. Compter une journée de setup vs une heure pour Sentry.
- Mauvais : **courbe d'apprentissage.** PromQL, LogQL, config Alloy, construction de dashboards.

### D. Datadog

Plateforme tout-en-un. ~300-500 $/mois pour 5 projets (infra + APM + logs + RUM). Free tier : 5 hosts, 1 jour de rétention.

| Pilier | Couverture |
|---|---|
| Erreurs | **OUI** — error tracking intégré à APM et RUM, source maps, dédup, session replay. |
| Logs | **OUI** — ingestion + indexation, recherche, rétention configurable. |
| Métriques | **OUI** — APM par route, custom metrics, dashboards auto-générés. |
| Alerting Teams | **OUI** — intégration native Teams. |
| Infra bare metal | **OUI** — Datadog Agent, métriques système complètes. |
| Services managés (MySQL, Redis OVH) | **OUI** — intégrations natives, dashboards pré-construits. |
| Métriques métier | **OUI** — custom metrics, dashboards flexibles. |
| Web Vitals | **OUI** — RUM, LCP/CLS/INP. |

- Bon : **tout est intégré** — erreurs, logs, métriques, APM, infra, services managés, RUM, dans une seule plateforme.
- Bon : **UX la plus polie** — onboarding rapide, dashboards auto-générés.
- Bon : **setup simple** — `dd-trace` en 2-4 lignes, agent en une commande.
- Bon : **intégrations services managés** natives avec dashboards pré-construits.
- Mauvais : **cher.** ~300-500 $/mois pour 5 projets. 3 600-6 000 $/an.
- Mauvais : **chaque feature est un compteur séparé** — infra, APM, logs, RUM, custom metrics. Le coût est imprévisible et tend à monter.
- Mauvais : **pas de free tier exploitable** — 5 hosts, 1 jour de rétention.
- Mauvais : **surdimensionné** pour une agence de 5-6 personnes avec 5 projets.

### E. Elastic Cloud (ELK serverless)

Elastic APM + Kibana + Elasticsearch. Version serverless (pas de cluster à gérer). ~50-100 $/mois pour 5 projets.

| Pilier | Couverture |
|---|---|
| Erreurs | **PARTIEL** — Elastic APM capture les erreurs mais error tracking basique (grouping limité, pas d'inbox type Sentry). |
| Logs | **OUI** — Elasticsearch, recherche full-text la plus puissante du panel. |
| Métriques | **OUI** — APM, custom metrics, dashboards Kibana. |
| Alerting Teams | **PARTIEL** — webhook via Power Automate (connecteurs O365 dépréciés). |
| Infra bare metal | **OUI** — Elastic Agent / Metricbeat. |
| Services managés (MySQL, Redis OVH) | **OUI** — Metricbeat avec modules MySQL, Redis, PostgreSQL. |
| Métriques métier | **OUI** — custom metrics, dashboards Kibana. |
| Web Vitals | **OUI** — Elastic RUM, LCP/CLS/INP. |

- Bon : **tout-en-un** — erreurs, logs, métriques, infra, services managés.
- Bon : **recherche full-text puissante** — Elasticsearch est la référence.
- Bon : **coût modéré** en serverless (~50-100 $/mois).
- Bon : **infra et services managés couverts** via Elastic Agent / Metricbeat.
- Mauvais : **Kibana est moins intuitif** que Grafana ou Sentry pour les dashboards.
- Mauvais : **intégration Teams dégradée** — les connecteurs O365 sont dépréciés, il faut passer par Power Automate.
- Mauvais : **quelqu'un doit devenir "la personne Elastic"** — la courbe d'apprentissage est raide sans expérience ELK.
- Mauvais : **pas d'expérience interne** sur la stack Elastic.

## Decision Outcome

**Grafana Cloud (option B) recommandé.** Datadog et Elastic écartés — Datadog est trop cher (~300-500 $/mois), Elastic n'apporte rien de plus et personne ne connaît la stack.

### Ce qui oriente la recommandation

1. **Les intégrations services managés font la différence.** MySQL et Redis OVH sont monitorés via les endpoints standard, avec 80+ métriques et des dashboards pré-construits. Sentry ne voit que le code applicatif — la DB et le cache sont des boîtes noires.

2. **Le bare metal passe de zéro à couvert.** Grafana Alloy est un seul binaire par serveur qui collecte métriques + logs. Sentry ne fait pas ça du tout.

3. **Une seule plateforme, un seul alerting.** Erreurs, logs, métriques infra, métriques DB — tout remonte au même endroit, les alertes Teams partent d'un seul outil.

4. **Le free tier couvre notre volume.** 10k séries métriques, 50 GB logs, 3 utilisateurs, 14 jours de rétention — probablement suffisant sans passer au payant.

5. **Le dashboarding custom est sans équivalent** pour les métriques métier (temps de traitement d'un dossier, etc.) — c'est un besoin récurrent qu'on gère mal aujourd'hui.

### Le compromis assumé

L'error tracking de Grafana est **moins riche que Sentry** : pas de dédup automatique des erreurs, pas d'inbox "issues", pas de session replay, pas de release tracking. Les erreurs remontent via les logs (Loki) et les traces (Tempo) — on peut configurer des alertes sur les logs d'erreur, mais il faut construire cette mécanique au lieu de l'avoir out-of-the-box.

C'est un compromis acceptable parce que :
- Les erreurs **remontent quand même** — via les logs structurés et l'alerting Grafana.
- Le volume d'erreurs sur nos projets est gérable — on n'est pas sur un SaaS à 100k utilisateurs où la dédup est critique.
- Le gain sur les autres piliers (infra, services managés, dashboards) compense largement.

| | Sentry (écarté) | Grafana Cloud (retenu) |
|---|---|---|
| **Error tracking** | Best-in-class | PARTIEL — logs + alertes, pas de dédup/inbox |
| **Logs** | 5 GB inclus | 50 GB free, Loki |
| **Métriques/dashboards** | Limité | Best-in-class (Prometheus + Grafana) |
| **Infra bare metal** | NON | OUI (Alloy) |
| **Services managés** | NON | OUI (MySQL, Redis, 150+ intégrations) |
| **Alerting Teams** | Natif | Webhook |
| **Setup** | ~1 heure | ~1 journée |
| **Coût** | ~26-50 $/mois | ~0-30 $/mois |

### Trajectoire

| Phase | Ce qui se passe |
|---|---|
| **1. Grafana Cloud + Faro** | Compte Grafana Cloud, SDK Faro front, OpenTelemetry back. Alerting Teams sur les erreurs. |
| **2. Logger structuré** | Module JSON dans `@igojs/server`, logs centralisés dans Loki. |
| **3. Infra + services managés** | Alloy sur le bare metal, intégrations MySQL/Redis OVH. Dashboards par projet. |
| **4. Cible** | Crash → mail retiré. Error handler `@igojs/server` capture sans `process.exit(1)`. |

## Consequences

- Bon : **une plateforme unique** pour les 4 piliers — erreurs, logs, métriques, alerting.
- Bon : **le bare metal et les services managés OVH sont couverts** — aujourd'hui ils sont dans le noir.
- Bon : **le front passe de zéro visibilité à un filet de sécurité réel.**
- Bon : **dashboards custom** pour les métriques métier par projet.
- Bon : **coût maîtrisé** — free tier probablement suffisant, ~0-30 $/mois.
- Mauvais : **error tracking moins riche que Sentry** — pas de dédup, pas d'inbox, pas de session replay. Compromis accepté.
- Mauvais : **courbe d'apprentissage** — PromQL, LogQL, config Alloy, construction de dashboards. Compter une journée de setup initiale.
- Mauvais : **le logger structuré est un chantier** sur les projets existants.
- Mauvais : **la suppression du crash → mail** demande une évolution d'`@igojs/server`.

## Confirmation

Dans six mois :
- **Temps moyen entre apparition d'un bug et sa détection** — cible : < 24h (aujourd'hui : infini côté front).
- **Les logs sont-ils centralisés et cherchables ?**
- **Le bare metal est-il monitoré ?**
- **Le crash → mail est-il encore le seul filet back ?** Si oui, la phase 4 n'a pas été atteinte.

## More Information

### Détail des besoins par pilier

Les besoins complets sont détaillés dans le Context. Résumé pour référence rapide :

**Erreurs** — source maps, dédup, breadcrumbs, corrélation front/back, suivi par release. Services tiers inclus (API partenaires, SMTP, stockage).

**Logs** — JSON, centralisés, 7-15 jours prod / 3 jours staging. Attributs : `level`, `timestamp`, `service`, `version`, `env`, `requestId`, `httpStatus`, `userId`, `duration`.

**Métriques** — P50/P95/P99 par route, taux d'erreur HTTP, SQL lentes, Web Vitals (grand public), uptime. Métriques métier custom par projet. Infra bare metal en nice-to-have.

**Alerting** — seuils, pas unitaire. Teams principal, mail backup. Configurable par projet.

### Grille comparative des plateformes

| Pilier | Sentry | Grafana Cloud | Datadog | Elastic Cloud |
|---|---|---|---|---|
| **Erreurs front** | **Best-in-class** | PARTIEL (Faro, pas de dédup) | OUI | OUI (APM) |
| **Erreurs back** | **OUI** | PARTIEL (logs/traces) | OUI | OUI (APM) |
| **Logs structurés** | OUI (5 GB inclus) | **OUI** (Loki, 50 GB free) | OUI | **OUI** (Elasticsearch) |
| **Métriques/APM** | OUI | **OUI** (Prometheus) | **OUI** | OUI |
| **Dashboards custom** | Limité | **Best-in-class** | OUI | OUI (Kibana) |
| **Alerting Teams** | OUI (natif) | OUI (webhook) | OUI (natif) | OUI (webhook) |
| **Web Vitals** | OUI | OUI (Faro) | OUI (RUM) | OUI (RUM) |
| **Infra bare metal** | **NON** | **OUI** (Alloy) | OUI (Agent) | OUI (Agent) |
| **Services managés (MySQL, Redis)** | **NON** | **OUI** (150+ intégrations, dashboards pré-construits) | OUI (intégrations natives) | OUI (Metricbeat) |
| **Métriques métier** | PARTIEL | **OUI** | OUI | OUI |
| **Setup** | ~1 heure | ~1 journée | ~2 heures | ~1 journée |
| **Coût /mois (5 projets)** | ~26-50 $ | ~0-30 $ | ~300-500 $ | ~50-100 $ |
| **Free tier** | 5k erreurs, 1 user | 10k séries, 50 GB logs, 3 users | 5 hosts, 1 jour | 14 jours trial |

### Error Boundary et gestion des erreurs React

Un Error Boundary racine redirige vers une page d'erreur générique. Les erreurs visibles au quotidien sont les **erreurs réseau** — chaque section qui appelle `useQuery` gère explicitement loading, error et data. Le composant `<ErreurSection>` est partagé dans `components/`.

### Trajectoire de suppression du crash → mail

Le crash → mail reste en parallèle pendant les phases 1-3. La phase 4 (cible) demande une évolution du error handler d'`@igojs/server` : les erreurs sont capturées et remontées à la plateforme choisie **sans tuer le process**. Le `process.exit(1)` actuel est un effet de bord utilisé comme alerte, pas un choix d'architecture.
