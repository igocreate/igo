# Observabilité back

**Statut** : proposé  
**Date** : 2026-08-24

## Context and Problem Statement

Le back igo dispose déjà d'un système de surveillance : les exceptions non attrapées font crasher le process, pm2 le redémarre, et un mail est envoyé avec le stack trace, le contexte de la requête et les headers (données sensibles caviardées). Un throttle intégré bloque les mails après 3 occurrences de la même erreur en une minute, pendant 5 minutes — ce qui limite le bruit en cas de crash loop.

Ce système a fait ses preuves. Mais il a trois limites :

1. **Il repose sur le crash.** L'erreur non attrapée fait tomber le process — `process.exit(1)` après un délai d'une seconde. C'est une fenêtre d'indisponibilité à chaque erreur, même ponctuelle. Ce n'est pas un pattern à garder sur le long terme.
2. **Pas de vue d'ensemble.** Les mails forment une file non triée. Impossible de voir les tendances, les erreurs les plus fréquentes, les régressions par release.
3. **Pas de corrélation front/back.** Si le front reçoit une 500, il faut chercher manuellement dans les mails serveur quel crash correspond.

Les métriques de performance existent partiellement via le load balancer OVH, mais sans alerting intégré ni corrélation avec les erreurs applicatives.

## Considered Options

### A. Sentry côté back (si adopté pour le front)

`@sentry/node` instrumente Express automatiquement — une ligne de config.

- Bon : **corrélation front/back** — une erreur front causée par une 500 back apparaît dans la même trace.
- Bon : **déduplication, dashboards, suivi par release** — mêmes bénéfices qu'au front.
- Bon : **performance monitoring intégré** — temps de réponse par route, requêtes SQL lentes, alerting sur les seuils. Remplace les métriques partielles du load balancer OVH avec de l'alerting.
- Bon : **le crash n'est plus nécessaire pour alerter.** Sentry capture l'erreur sans tuer le process — le chemin vers la suppression du `process.exit(1)`.
- Neutre : coût marginal faible si le plan Team est déjà en place pour le front. Le free tier (5K erreurs/mois, 1 utilisateur) peut suffire au démarrage.

### B. Garder le crash → mail seul

- Bon : gratuit, en place, éprouvé.
- Mauvais : pas de corrélation, pas de dashboards, pas de performance monitoring.
- Mauvais : **le crash comme mécanisme d'alerte** reste le seul chemin — on ne peut pas le retirer sans alternative.

### C. Ne rien changer

Écarté : si Sentry est adopté pour le front, ne pas l'étendre au back prive de la corrélation, qui est le principal gain.

## Decision Outcome

**Sentry étendu au back, conditionné à son adoption pour le front.** Le coût marginal est quasi nul (une ligne de config, pas de compte supplémentaire). Le crash → mail reste en parallèle dans un premier temps.

### Trajectoire de transition du crash → mail

| Phase | État | Crash → mail | Sentry |
|---|---|---|---|
| **Aujourd'hui** | Crash = alerte + redémarrage pm2 | Actif, seul filet | Non |
| **Adoption Sentry** | Sentry capture les erreurs, crash → mail reste en redondance | Actif, redondant | Actif |
| **Stabilisation** | Sentry a prouvé sa fiabilité, alerting configuré | **Retiré** | Actif, seul filet |
| **Cible** | Les erreurs sont capturées sans crash — le process ne tombe plus | Retiré | Actif, `process.exit(1)` supprimé |

La phase cible demande une évolution du error handler d'`@igojs/server` : les erreurs non attrapées sont logguées et remontées à Sentry **sans tuer le process**. C'est un meilleur pattern — le crash actuel est un effet de bord utilisé comme alerte, pas un choix d'architecture.

### Ce qu'on monitore

| Quoi | Pourquoi | Priorité |
|---|---|---|
| **Erreurs applicatives** | Le filet de base — exceptions, rejets de promesse, erreurs SQL | Dès l'adoption |
| **Temps de réponse des routes API** | Détecter les régressions de perf avant les plaintes utilisateurs, remplace les métriques partielles OVH avec de l'alerting intégré | Dès l'adoption |
| **Requêtes SQL lentes** | Identifier les requêtes à optimiser | Optionnel, activable par projet |

### Alerting

Sentry permet des alertes par seuil, là où le crash → mail envoie un mail par erreur (ou le throttle après 3) :

- **Erreurs** : alerte si plus de N erreurs en M minutes sur un projet.
- **Performance** : alerte si le P95 d'une route dépasse un seuil.
- **Canaux** : mail, Slack, webhook — configurables par projet.

## Consequences

- Bon : **la corrélation front/back** rend le diagnostic d'une erreur utilisateur immédiat — plus de recherche manuelle dans les mails.
- Bon : **le chemin vers la suppression du crash comme alerte** est tracé. Le `process.exit(1)` devient un choix conscient à retirer, pas un acquis.
- Bon : **le performance monitoring remplace les métriques OVH** avec de l'alerting intégré et corrélé aux erreurs.
- Neutre : **le crash → mail reste en phase de transition.** Deux systèmes en parallèle, temporairement.
- Mauvais : **la suppression du crash demande une évolution d'`@igojs/server`** — le error handler doit capturer sans `process.exit(1)`. C'est un changement de comportement à tester soigneusement (risque de process zombie si une erreur corrompt l'état).

## Confirmation

- **Temps moyen entre erreur back et diagnostic** — aujourd'hui, lecture du mail + corrélation manuelle. Avec Sentry, un clic.
- **Nombre de crashs pm2 par mois** — à la phase cible, il doit tendre vers zéro (les erreurs sont capturées sans crash).
- **Couverture de l'alerting** — chaque projet a ses seuils configurés, pas de mails non triés.

## More Information

Cette décision est le pendant back de l'[observabilité front](observabilite-front.md). Les deux partagent le même projet Sentry, ce qui permet la corrélation. Elle implique une évolution du error handler d'`@igojs/server` à terme — documentée dans la feuille de route du socle igo.
