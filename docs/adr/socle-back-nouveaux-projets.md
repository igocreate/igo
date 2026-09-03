# Socle back — nouveaux projets

**Statut** : instruit — décision au premier greenfield  
**Date** : 2026-09-03  
**Portée** : projets greenfield uniquement. Les projets existants restent sur igo — cette décision ne les concerne pas.

## Context and Problem Statement

L'[ADR architecture front](architecture-front-de-reference.md) a recentré igo sur ses deux paquets mûrs — le serveur Express et l'ORM. La couche vue (dust) et la couche composants (`@igojs/component`) passent en maintenance. Le framework restant est plus petit, plus stable, et plus facile à évaluer.

La question est : **pour un projet neuf, part-on sur ce socle allégé (igo-next), adopte-t-on un framework de marché (NestJS), ou garde-t-on le serveur igo avec un ORM de marché ?**

L'analyse comparative de `@igojs/db` face aux ORM TypeScript du marché (Prisma, Drizzle, MikroORM, TypeORM, Kysely) permet d'instruire les trois options.

### Ce que l'expérience interne établit

| Source | Ce qu'elle dit |
|---|---|
| **10 ans d'igo en production** | Le serveur et l'ORM sont stables. Express n'a pas changé de façon fondamentale depuis sa création (2010). |
| **`@igojs/db` vs MikroORM** | L'ORM igo est plus simple à utiliser, cache nativement, les transactions isolées pour les tests marchent mieux (MikroORM ne lock pas ses migrations, transaction isolation plus complexe à mettre en place). |
| **funecap `api-ceremonie`** sur NestJS + MikroORM | 3 personnes connaissent NestJS. La modularisation est appréciée (séparation API/workers). Le boilerplate est plus lourd mais absorbé par le LLM. |
| **L'assistance LLM sur igo** | Structurellement plus faible — un modèle a vu quasi zéro code igo. Atténuable par une skill dédiée qui documente les conventions. |
| **Analyse comparative ORM (sept. 2026)** | Aucun ORM du marché n'offre le même ensemble cache natif + test isolation + migration lock + pagination optimisée. Mais tous offrent TypeScript, un écosystème plus large, et un meilleur support LLM. Détail en [More Information](#more-information). |

## Considered Options

### A. igo-next — Express + `@igojs/db`

Le socle allégé : igo sans dust, sans `@igojs/component`, sans webpack, sans forms. Express + ORM + conventions, avec les améliorations décidées par les autres ADR (TypeScript, Zod, error handler JSON, Vitest).

**Ce qu'il faut construire avant le premier greenfield :**

| Évolution | Effort | ADR de référence |
|---|---|---|
| Retirer dust, component, webpack, forms de l'export | Faible | — |
| Squelette API-first (`skel/api`) | Moyen | [Organisation sources back](organisation-des-sources-back.md) |
| TypeScript (`allowJs: true` + `.d.ts` sur l'API publique) | Moyen | — |
| Middleware validation Zod | Faible | [Organisation sources back](organisation-des-sources-back.md) |
| Error handler JSON sur les routes API | Faible | [Organisation sources back](organisation-des-sources-back.md) |
| Support Vitest (`dev.vitest()`) | Faible | [Stratégie de test back](strategie-de-test-back.md) |
| Skill LLM documentant les conventions igo | Moyen | — |

- Bon : **les trois acquis ORM sont préservés** — cache, test isolation, migration lock. Aucun concurrent n'offre cet ensemble.
- Bon : **Express = stabilité long terme.** 16 ans, API quasi figée.
- Bon : **coût d'apprentissage nul.** L'équipe connaît les conventions.
- Bon : **simplicité.** Handler Express + service + modèle. Pas de décorateurs, pas de DI.
- Mauvais : **pas de TypeScript sur l'ORM.** Le code applicatif passe en TS, mais les requêtes DB restent non typées. C'est la lacune la plus visible au quotidien.
- Mauvais : **bus factor** sur l'ORM — une seule personne en a la maîtrise profonde.
- Mauvais : **pas d'écosystème communautaire.** Chaque feature manquante est un chantier interne.
- Mauvais : **assistance LLM plus faible**, même avec une skill.
- Mauvais : **le travail d'évolution doit être fait avant le premier greenfield.**

### B. NestJS + ORM de marché

On quitte igo. Framework TypeScript-first avec modules, injection de dépendances, décorateurs, écosystème riche. ORM à choisir séparément — Drizzle ou Prisma sont les candidats les plus crédibles (voir [comparatif](#comparatif-détaillé-des-orm)).

- Bon : **TypeScript de bout en bout**, framework et ORM.
- Bon : **modularisation native.** Séparation API/workers naturelle.
- Bon : **écosystème intégré** — Passport, Swagger, Bull, WebSocket, GraphQL. `npm install` + un décorateur.
- Bon : **documentation massive, communauté large, LLM très performant.**
- Bon : **3 personnes le connaissent** via funecap.
- Bon : **recrutement** — NestJS est un mot-clé reconnu.
- Mauvais : **perte des trois acquis ORM igo.** Le cache natif, le test isolation simple et le migration lock ne se retrouvent pas tels quels. Drizzle a un cache récent et pas de migration lock. Prisma a un lock mais pas de cache natif gratuit. Le test isolation demande du setup manuel partout.
- Mauvais : **la cérémonie NestJS.** Module + contrôleur + service + DTO + décorateurs par route CRUD.
- Mauvais : **deux stacks back dans l'agence.** Projets existants sur igo, nouveaux sur NestJS. À 5-6, le context-switching pèse.
- Mauvais : **stabilité relative.** NestJS sur Express = une couche d'abstraction supplémentaire. Si NestJS tombe, on retombe sur Express — exactement là où igo est déjà.
- Mauvais : **la DI est un outil de grande équipe.** À 5-6, elle ajoute de l'indirection sans résoudre un problème qu'on a.

### C. igo/server + ORM de marché

On garde `@igojs/server` (Express + conventions igo) mais on remplace `@igojs/db` par un ORM du marché. Le serveur reste le même — routes, middleware, config, i18n, mailer. Seule la couche données change.

**Ce que ça implique concrètement :**

| Évolution | Effort |
|---|---|
| Tout le travail igo-next de l'option A (sauf la skill ORM) | Identique à A |
| Intégration de l'ORM choisi dans le squelette igo | Moyen |
| Adaptation de `dev.test()` pour le test isolation avec le nouvel ORM | Moyen à élevé |
| Réécriture des conventions de modèle / service | Moyen |

- Bon : **on gagne TypeScript sur les requêtes DB** — le principal manque d'igo/db.
- Bon : **Express + conventions igo** — la simplicité du serveur est préservée. Pas de DI, pas de décorateurs, pas de modules NestJS.
- Bon : **écosystème et LLM** de l'ORM de marché sur la couche données.
- Bon : **une seule stack serveur** pour toute l'agence (les projets existants restent sur igo complet, les nouveaux sur igo/server + ORM marché).
- Bon : **bus factor réduit** sur la couche données — un ORM maintenu par une communauté.
- Mauvais : **perte des trois acquis ORM igo.** Même constat que l'option B — le cache, le test isolation et le migration lock doivent être reconstruits ou acceptés comme manques.
- Mauvais : **couche hybride.** Un serveur igo avec un ORM tiers crée une combinaison que personne d'autre n'utilise. Pas de documentation de cette combinaison, pas de retour d'expérience communautaire. Le LLM connaît l'ORM mais pas l'assemblage.
- Mauvais : **le `dev.test()` d'igo est construit sur `@igojs/db`.** L'adapter à un ORM tiers demande un travail non trivial — c'est le principal couplage.
- Mauvais : **l'argument « igo/server sans igo/db » pose la question de ce que igo apporte encore.** Si le serveur est juste Express + quelques conventions, la valeur ajoutée d'igo se réduit à de la config et du scaffolding — ce qu'un squelette NestJS ou un template Express fait aussi.

## Decision Outcome

**igo-next (option A) recommandé comme socle par défaut.**

### Ce qui a orienté la recommandation

1. **Les trois acquis ORM sont un différenciateur concret.** Aucun ORM du marché n'offre nativement l'ensemble cache + test isolation simple + migration lock. Le poids de cet argument **diminue** si l'équipe n'utilise pas le cache Redis ou si les tests n'exploitent pas le rollback par transaction.

2. **L'absence de TypeScript sur l'ORM est le principal risque.** Le marché est TypeScript-first. Ajouter des `.d.ts` sur l'API publique de `@igojs/db` atténuerait le problème ; ne rien faire rendrait la comparaison intenable à 2-3 ans.

3. **L'option C ne tient pas l'examen.** Elle cumule les inconvénients : on perd les acquis ORM, on crée un assemblage non documenté, on casse `dev.test()`, et la valeur résiduelle d'igo/server seul ne justifie pas le coût. Si on lâche l'ORM, autant prendre NestJS qui apporte un vrai écosystème en échange.

4. **Express reste le choix le plus stable.** 16 ans, API quasi figée. NestJS est une couche d'abstraction supplémentaire par-dessus.

5. **La skill LLM comble l'écart d'assistance.** Une skill sur un framework propriétaire sera toujours en retrait par rapport à un ORM vu dans des millions de projets, mais le mécanisme fonctionne.

### Le vrai pivot : TypeScript sur `@igojs/db`

Le comparatif fait apparaître que la décision igo-next vs NestJS se joue de plus en plus sur **un seul axe** : le type safety des requêtes DB. Les trois acquis ORM justifient de rester — mais seulement si l'écart TypeScript ne se creuse pas.

Deux chemins pour réduire cet écart :

| Chemin | Effort | Résultat |
|---|---|---|
| `.d.ts` sur l'API publique de `@igojs/db` (Model, Query, Schema) | Moyen | Autocomplétion et vérification sur les appels. Pas de type safety sur les résultats de requêtes. |
| Réécriture de `@igojs/db` en TypeScript avec inférence des types de requêtes | Élevé | Parité avec Drizzle/Prisma sur le type safety. Investissement significatif. |

Le premier chemin est un prérequis réaliste. Le second est un investissement dont le coût doit être évalué contre le bénéfice — si l'effort dépasse celui d'adopter un ORM de marché, l'argument s'inverse.

### Quand NestJS + ORM marché devient le meilleur choix

La recommandation igo-next n'est pas un verrou. NestJS se justifie si :

- **Le projet a besoin de modularisation de déploiement** — API, workers, cron déployés séparément.
- **Le projet n'utilise pas le cache Redis ni le test isolation d'igo** — les acquis ORM ne pèsent plus.
- **L'équipe qui porte le projet connaît NestJS et pas igo.**
- **Les `.d.ts` sur `@igojs/db` n'ont pas été livrés** — l'écart TypeScript est resté tel quel.

La décision se prend **projet par projet**, pas une fois pour toutes.

### Prérequis : les évolutions igo-next

La recommandation igo-next **suppose que le travail d'évolution est fait** avant le premier greenfield. Les `.d.ts` sur l'API publique de l'ORM s'ajoutent à la liste précédente comme prérequis.

### Investissement structurant : la skill LLM pour igo

Indépendante du choix de socle, cette skill bénéficie à **tous les projets** — existants et greenfield :

- Documentation des conventions igo (Model, Query, Schema, associations, cache, config).
- Patterns de test (dev.agent, dev.test, Factory, transactions).
- Patterns de routes et middleware.
- Erreurs courantes et leurs solutions.

## Consequences

- Bon : **un seul socle back pour toute l'agence**, dans le cas par défaut.
- Bon : **les trois acquis ORM sont préservés** — cache, test isolation, migration lock.
- Bon : **la skill LLM bénéficie à l'existant** — les 5 projets en production sur igo s'améliorent.
- Neutre : **NestJS n'est pas fermé** — il reste éligible avec des critères explicites.
- Neutre : **l'option C (igo/server + ORM marché) est écartée** — elle n'apporte pas assez pour justifier le coût de l'assemblage.
- Mauvais : **le travail d'évolution est un investissement** — squelette, TypeScript, skill, et maintenant `.d.ts` sur l'ORM.
- Mauvais : **le bus factor sur l'ORM reste**, atténué mais pas résolu.
- Mauvais : **l'écart TypeScript est un risque à surveiller** — si les `.d.ts` ne sont pas livrés, la recommandation s'affaiblit.

## Confirmation

**Cette décision est instruite, pas tranchée.** Elle sera actée au premier greenfield.

À douze mois du premier greenfield :
- **Le squelette igo-next existe-t-il et est-il utilisable ?** Si non, NestJS gagne par défaut.
- **Les `.d.ts` sur `@igojs/db` sont-ils en place ?** Si non, l'écart TypeScript n'a pas été comblé et l'argument principal pour igo s'affaiblit.
- **La skill LLM est-elle en place et efficace ?** Si non, l'écart d'assistance reste.
- **L'équipe a-t-elle un avis après avoir utilisé le squelette ?** Le retour terrain vaut plus que l'analyse.

## More Information

C'est l'**axe 3** du [cadre de décision](../cadre-decision-stack-front.md), identifié dès le début comme différé. Les axes 1 et 2 (front) sont tranchés ; celui-ci est instruit et attend son terrain d'application.

### Comparatif détaillé des ORM

Analyse réalisée en septembre 2026 sur les sources officielles et les retours communautaires de chaque ORM. Les ORM évalués : **Prisma** (v8, ~17M downloads/semaine), **Drizzle** (v0.45, ~12M), **MikroORM** (v7, ~460k), **TypeORM** (v1.0, ~5M), **Kysely** (v0.29, ~16M — query builder pur, pas un ORM).

#### Grille comparative

| Axe | `@igojs/db` | Prisma | Drizzle | MikroORM | TypeORM | Kysely |
|---|---|---|---|---|---|---|
| **Cache natif** | **OUI** — Redis, version-based, JOIN-aware, stats | Payant (Accelerate) | OUI — récent, provider-agnostic | PARTIEL — mémoire, TTL 1s, invalidation manuelle | OUI — Redis/DB, invalidation manuelle | NON |
| **Test isolation (rollback)** | **OUI** — intégré, 1 ligne | Community (jest-prisma) | Community (drizzle-orm-test) | OUI mais complexe (surtout NestJS) | Community | OUI — API transaction manuelle |
| **Migration lock** | **OUI** — advisory lock | OUI — avec bugs connus | **NON** — bug ouvert depuis 2023 | **NON** | **NON** | OUI |
| **Pagination optimisée** | **OUI** — COUNT/IDS/FULL auto | Cursor + offset | Offset + cursor manuel | OUI — cursor + subquery auto | Offset seul | Offset seul |
| **Scopes** | **OUI** — default + named + unscope | PARTIEL — via extensions | Beta | **OUI** — Filters | NON (community) | PARTIEL — composable |
| **TypeScript** | **NON** | **OUI** — best-in-class | **OUI** — sans codegen | **OUI** — Loaded<T> | PARTIEL — QB non typé | **OUI** — best-in-class |
| **Relations** | PARTIEL — belongs_to, has_many | **OUI** — polymorphique v8 | OUI | **OUI** — polymorphique v7 | **OUI** | NON (query builder) |
| **Migrations up/down** | PARTIEL — up only, pas de down | PARTIEL — down manuel | **NON** — pas de down | OUI | **OUI** — auto-gen + down | OUI |
| **Seeds** | **OUI** — natif, CLI, bloqué en prod | PARTIEL — hook configurable | NON | **OUI** — SeedManager | NON (community) | NON |
| **Hooks/lifecycle** | PARTIEL — before only | PARTIEL — via extensions | NON (community) | **OUI** — cycle complet | **OUI** — 11 hooks | PARTIEL — plugins query-level |
| **Soft deletes** | NON | NON (community) | NON (community) | Community | **OUI** — natif | NON (community) |
| **Bulk insert** | NON | OUI — createMany | OUI | OUI — insertMany | OUI (mais save() piège) | OUI |
| **Transactions publiques** | NON (test only) | OUI | OUI | OUI | OUI | OUI |
| **Express / NestJS** | Express seul | Les deux | Les deux | Les deux (officiel NestJS) | Les deux (officiel NestJS) | Les deux |
| **Communauté** | Interne | ~47k★, 17M/sem | ~36k★, 12M/sem | ~9k★, 460k/sem | ~37k★, 5M/sem | ~14k★, 16M/sem |
| **Assistance LLM** | Faible (skill nécessaire) | Excellente | Bonne | Modérée | Excellente | Bonne |

#### Profil de chaque ORM concurrent

**Prisma** — Le plus populaire. Type safety best-in-class grâce au client généré. Écosystème le plus riche. Mais : code generation obligatoire, pas de cache natif gratuit (Accelerate est payant), DSL dédié (Prisma Schema Language), les requêtes complexes tombent sur `$queryRaw`. Migration down manuelle. Financé ($56M levés, 134 employés).

**Drizzle** — Le challenger. SQL-first, léger (~7 KB), type-safe sans code generation. Cache natif récent (Upstash). Mais : pas de migration lock (bug ouvert), pas de migrations down, pas de hooks en core, pas de soft deletes en stable. 2000+ issues ouvertes avec des questions sur la santé du projet. Pas encore en v1.

**MikroORM** — Le plus proche de Doctrine/Hibernate. Unit of Work, Identity Map, Data Mapper. Type safety forte (`Loaded<T>`). Relations complètes, hooks complets. Mais : courbe d'apprentissage raide, pas de migration lock, test isolation complexe (confirmé sur funecap), communauté plus petite, maintenu par une seule personne. Pas de cache comparable.

**TypeORM** — Le vétéran, relancé avec v1.0. Cache Redis natif, 11 hooks, soft deletes natifs, relations complètes. Mais : QueryBuilder non typé, pas de migration lock, `save()` est un piège de performance (2N queries pour N entités), maintenance historiquement instable (période 2022-2024).

**Kysely** — Pas un ORM, un query builder pur. Type safety excellente. Pas de relations, pas de hooks entité, pas de soft deletes. Pertinent si on veut construire sa propre couche ORM par-dessus — mais c'est exactement le travail qu'on cherche à éviter.

#### Résumé pour la décision

L'ORM igo n'est pas en retard sur tout — il est en avance sur le cache, le test isolation et le migration lock. Mais il est en retard sur TypeScript, les relations, les transactions publiques, les hooks et l'écosystème. Le marché ne propose pas de remplacement drop-in qui serait meilleur partout : chaque concurrent gagne sur certains axes et perd sur d'autres.

Le scénario **« on prend Drizzle ou Prisma et tout est résolu »** ne tient pas : on gagne TypeScript et l'écosystème, mais on perd le cache natif, le test isolation simple, et (pour Drizzle) le migration lock. Ce sont des régressions concrètes sur des fonctionnalités utilisées quotidiennement.

Le scénario **« on reste sur igo/db tel quel »** ne tient pas non plus à moyen terme : l'absence de TypeScript sur les requêtes DB est un écart qui se creuse chaque année.
