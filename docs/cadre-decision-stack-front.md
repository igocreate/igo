---
titre: Cadre de décision — stack front de référence
décision: Choisir la stack front par défaut de l'agence pour les projets dont on a le build et le run
échéance: septembre 2026
horizon: 3 à 5 ans
statut: décidé — front React en assets statiques, un artefact, habillage shadcn/ui, buildé sur le serveur
date: 2026-08-21
révision: v7 — ADR back ajoutés, axe 3 instruit, feuille de route du socle
---

# Cadre de décision — stack front de référence

**Ce document ne décide rien.** Il porte le périmètre de l'étude, l'index des preuves et l'ordre des décisions. Les arbitrages sont dans les ADR, qui sont la seule source à citer.

## Périmètre

| | |
|---|---|
| **Décision** | La stack front **par défaut** de l'agence, pour les projets dont elle assure **le build et le run** |
| **Exceptions** | Les projets de **build seul** peuvent recevoir une stack imposée (cas funecap) |
| **Horizon** | 3 à 5 ans · **décision prête en septembre 2026** — prête, pas exécutée : les travaux démarrent au go et au budget client |
| **Non décidé** | Aucune migration d'existant n'est engagée. Chaque refonte se décide ensuite, projet par projet, en cohabitation durable avec les 1 669 templates dust |
| **Portefeuille** | ladom, certigo, un projet mobile React Native, les projets futurs. funecap en sort : build seul, sans run |
| **Équipe** | 5-6 personnes : 3 ladom · 2 funecap · 1 certigo · 1 dirigeant transverse, qui porte igo |
| **Paramètres posés** | TypeScript souhaitable mais non bloquant · SEO et web perf non critiques · bascule vers du JSON plutôt que des formulaires · **pas de complexité pour rien** |
| **Attention** | Les deux refontes qui motivent l'échéance **ne sont pas confirmées**. La décision doit être bonne pour l'agence même si aucune ne se fait |

## Les axes de décision

Les axes suffixés « bis » dépendent de celui qu'ils suivent. Entre les axes principaux, la dépendance est plus faible qu'il n'y paraît : seul l'axe 1 devait être tranché en premier.

| | Axe | Décide | État |
|:--:|---|---|---|
| **1** | **Architecture front** — igo + `@igojs/component`, ou front à composants en assets statiques | [Architecture front de référence](adr/architecture-front-de-reference.md) | **Accepté** — front à composants en assets statiques, un artefact |
| **1 bis** | **Chaîne de build** — où vit la source du front, où tourne son build | [Chaîne de build du front](adr/chaine-de-build-du-front.md) | **Accepté** — un dépôt par projet, front en projet npm frère, build sur le serveur |
| **2** | **Technologie de composants** | [Technologie de composants front](adr/technologie-de-composants-front.md) | **Accepté — React**, le 21 août 2026 |
| **2 bis** | **Système de design** — décision produit, contrainte par l'axe 2 | [Système de design](adr/systeme-de-design.md) | **Accepté — shadcn/ui sur Tailwind**, le 21 août 2026 |
| **3** | **Socle back**, nouveaux projets uniquement | [Socle back — nouveaux projets](adr/socle-back-nouveaux-projets.md) | **Instruit** — igo-next recommandé, décision au premier greenfield |

**Décisions de mise en œuvre front** :

| Sujet | État |
|---|---|
| [Organisation des sources front](adr/organisation-des-sources-front.md) — structure par feature, frontière de données, routage | **Accepté** le 24 août 2026 |
| [Stratégie de test front](adr/strategie-de-test-front.md) — Vitest + Testing Library + MSW, règles de couverture | **Accepté** le 24 août 2026 |
| [Observabilité](adr/strategie-observabilite.md) — Grafana Cloud recommandé, 4 piliers (erreurs, logs, métriques, alerting) | **Proposé** le 4 sept. 2026 |

**Décisions de mise en œuvre back** :

| Sujet | État |
|---|---|
| [Organisation des sources back](adr/organisation-des-sources-back.md) — `@api/` pour les refontes, features pour les greenfield, DTOs | **Proposé** le 24 août 2026 |
| [Stratégie de test back](adr/strategie-de-test-back.md) — intégration avec la vraie base, Mocha existant / Vitest greenfield | **Accepté** le 24 août 2026 |

**Plan d'exécution** : [Feuille de route du socle igo](feuille-de-route-socle-igo.md) — séquence les évolutions en 5 phases.

**Décisions déjà prises**, indépendantes de l'axe 1 :

- [Format d'échange front/back](adr/format-echange-front-back.md) : JSON, pas de fragments HTML.
- [Stratégie de validation](adr/strategie-de-validation.md) : validation client *et* serveur, middleware dans `@igojs/server`, schémas partagés optionnels. Découle de la précédente.

Les ADR ne sont pas numérotés : ils portent le nom de ce sur quoi ils tranchent. Un numéro n'encoderait ici aucune chronologie utile — ils tiennent sur deux jours — et l'ordre de dépendance n'est pas linéarisable de façon stable. Chaque ADR porte sa date.

**Candidat ADR identifié, hors périmètre de cette étude** : l'empaquetage du back — Docker contre pm2. Aucun lien avec la décision front.

## Index des preuves

Ce sur quoi les ADR s'appuient. Chaque ligne porte le chiffre qui a compté.

| Source | Ce qu'elle établit |
|---|---|
| [Inventaire du besoin de réactivité](inventaire-besoin-reactivite.md) | **~85 % de la surface réactive exige un modèle d'état**, ~15 % se contentent d'une mise à jour partielle. Classement des 126 modules jQuery par motif. Inclut le test inverse sur funecap |
| [Rétrospective — coût de framework](retrospective-cout-framework.md) | **~1 écran sur 3** déclenche du travail de framework ou un contournement. Le péage se déclenche sur **l'habillage**, pas sur la logique. Coût passé : quelques jours à quelques semaines, engagés |
| [Atelier équipe du 19/08](atelier-equipe-20260819.md) | **Pondérations arrêtées par l'équipe.** Frictions quotidiennes chiffrées. Cinq besoins abandonnés faute d'outillage |
| Démo du 20/08 — POC React | Espace stagiaire de certigo porté en **moins d'une journée**, SCORM inclus, aucun process supplémentaire. Next.js et BFF écartés par l'équipe |
| Sources igo, `@igojs/component` 6.1.1 | Socle réactif **complet** : composition, listes par clé, état partagé, événements parent↔enfant. Manquent le typage, les transitions, la testabilité applicative. **8 releases du 21/05 au 17/06/2026** |
| Infra `ovh-ladom2` | nginx sert les assets (`try_files $uri @app`) ; igo ne les sert pas. `pm2 delete` → `pm2 start` ouvre une fenêtre d'indisponibilité. Six environnements |
| Diagnostic ladom *(via `research/`)* | Public mobile dominant en outre-mer, connectivité contrainte, terminaux anciens. Aucun analytics : pas de photo T0 |

## Hors comparatif — la continuité du socle

**Le socle est partagé par tous les clients, et sa maîtrise est inégale** : plusieurs personnes peuvent le maintenir, une seule en a la maîtrise fine. L'assistance par LLM abaisse le coût de reprise. Le risque de continuité est donc réel mais modéré, et il se traite **quelle que soit l'issue de la décision d'architecture** — en élargissant la maîtrise, ou en réduisant la surface du socle.

Tenu hors de la matrice de décision : c'est un sujet d'organisation, pas de technologie.

## Ce qui reste

1. **Valider les décisions auprès de l'équipe et de la direction** — l'architecture recentre igo sur l'API et l'ORM et met `@igojs/component` en maintenance ; la technologie retenue est React, habillée par shadcn/ui sur Tailwind.
2. **Identifier la bibliothèque de bas niveau utilisée par shadcn** — ouvrir un composant du registre et lire ses imports, deux minutes. L'accessibilité héritée et la dépendance réellement prise en dépendent.
3. **Instruire la cohabitation DSFR / Tailwind** sur le projet public, seule cohabitation CSS réelle du dossier.
4. **Garde-fou de réversibilité** : première mise en œuvre sur un périmètre abandonnable, un espace isolé par sous-domaine.
5. **Mesurer ce que consomme le build du front sur le serveur** — mémoire et temps, comparés au `webpack-prod` actuel. C'est ce chiffre qui dira si le build doit passer en CI tout de suite.

## Note de méthode

Ce dossier a été révisé une dizaine de fois, et **chaque révision est venue d'un fait apporté par l'équipe, non du code** : certigo comme terrain réel d'`@igojs/component`, la mise à jour du framework, le contournement des transitions, l'hybride comme héritage et non comme choix, les pondérations de l'atelier, le POC, la topologie nginx réelle.

Trois erreurs à retenir comme mise en garde pour la prochaine étude :

- Une absence de capacité conclue en cherchant le vocabulaire d'autres frameworks dans la documentation d'igo — alors que la preuve était dans l'usage, côté certigo.
- Une préférence architecturale inférée d'un « ce n'est pas un problème ».
- Des arguments d'axe 2 — compétences en place, convergence des paradigmes — glissés à plusieurs reprises dans l'analyse d'axe 1.

Dans les trois cas : un silence comblé par une hypothèse au lieu d'être marqué comme tel.
