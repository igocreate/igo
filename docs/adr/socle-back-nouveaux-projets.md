# Socle back — nouveaux projets

**Statut** : instruit — décision au premier greenfield  
**Date** : 2026-08-24  
**Portée** : projets greenfield uniquement. Les projets existants restent sur igo — cette décision ne les concerne pas.

## Context and Problem Statement

L'[ADR architecture front](architecture-front-de-reference.md) a recentré igo sur ses deux paquets mûrs — le serveur Express et l'ORM. La couche vue (dust) et la couche composants (`@igojs/component`) passent en maintenance. Le framework restant est plus petit, plus stable, et plus facile à évaluer.

La question est : **pour un projet neuf, part-on sur ce socle allégé (igo-next), ou adopte-t-on un framework de marché (NestJS) ?**

C'est le seul contexte où la question se pose. Sur un projet existant, igo est en place, les modèles, services et conventions fonctionnent — ajouter une couche API JSON ne remet pas le socle en question. C'est uniquement sur un terrain vierge qu'on a le luxe du choix.

### Ce que l'expérience interne établit

| Source | Ce qu'elle dit |
|---|---|
| **10 ans d'igo en production** | Le serveur et l'ORM sont stables. Express n'a pas changé de façon fondamentale depuis sa création (2010). |
| **`@igojs/db` vs MikroORM** | L'ORM igo est plus simple à utiliser, cache nativement, les transactions isolées pour les tests marchent mieux (MikroORM ne lock pas ses migrations, transaction isolation plus complexe à mettre en place). |
| **funecap `api-ceremonie`** sur NestJS + MikroORM | 3 personnes connaissent NestJS. La modularisation est appréciée (séparation API/workers). Le boilerplate est plus lourd mais absorbé par le LLM. |
| **L'assistance LLM sur igo** | Structurellement plus faible — un modèle a vu quasi zéro code igo. Atténuable par une skill dédiée qui documente les conventions. |

## Considered Options

### A. igo-next — le socle allégé

igo sans dust, sans `@igojs/component`, sans webpack, sans forms. Express + ORM + conventions, avec les améliorations décidées par les autres ADR (TypeScript, Zod, error handler JSON, Vitest).

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

- Bon : **l'ORM est le vrai différenciateur.** 10 ans de maturité, cache natif, transactions isolées pour les tests, migrations avec lock. On ne retrouve pas cet ensemble ailleurs sans le construire.
- Bon : **Express = stabilité long terme.** 14 ans, API quasi figée. igo n'est qu'une couche de conventions par-dessus — si igo disparaît, Express reste.
- Bon : **coût d'apprentissage nul.** L'équipe connaît les conventions, les alias, les patterns.
- Bon : **simplicité.** Un handler Express + un service + un modèle. Pas de décorateurs, pas de DI, pas de module system.
- Mauvais : **bus factor** sur la couche fine de l'ORM — plusieurs personnes savent l'utiliser, une seule en a la maîtrise profonde.
- Mauvais : **pas d'écosystème communautaire.** Chaque feature manquante (auth, swagger, WebSocket, queue) est un chantier interne ou une intégration Express à câbler.
- Mauvais : **le travail d'évolution doit être fait avant le premier greenfield.** Sans le squelette API-first et le support TypeScript, on comparerait un igo-legacy à un Nest neuf — match biaisé.
- Mauvais : **assistance LLM plus faible**, même avec une skill. Un modèle qui a vu des millions de projets NestJS sera toujours plus fiable qu'un modèle guidé par une skill sur un framework propriétaire.

### B. NestJS — un framework de marché

Framework TypeScript-first avec modules, injection de dépendances, décorateurs, et un écosystème riche. ORM à choisir séparément (MikroORM, Prisma, Drizzle).

- Bon : **TypeScript de bout en bout**, sans compromis. Types, décorateurs, métadonnées — tout est typé.
- Bon : **modularisation native.** Un module NestJS est un scope déployable — séparer API et workers (cron, queues) dans la même base de code est naturel. Igo sait faire du cron mais sur l'instance API, ce qui peut poser problème pour les traitements lourds.
- Bon : **écosystème intégré** — Passport (auth), Swagger (doc API auto), class-validator/Zod, Bull (queues), WebSocket, GraphQL. Ce sont des `npm install` + un décorateur, pas des chantiers.
- Bon : **documentation massive, communauté large, LLM très performant dessus.**
- Bon : **3 personnes le connaissent** via funecap, avec une preuve terrain en production.
- Bon : **recrutement** — NestJS est un mot-clé que les candidats cherchent.
- Mauvais : **la cérémonie.** Pour une route CRUD : un module, un contrôleur, un service, un DTO, des décorateurs. Le LLM absorbe l'écriture, mais la relecture est plus bruyante.
- Mauvais : **perte de l'ORM igo.** `@igojs/db` ne s'intègre pas avec NestJS. Il faut adopter un ORM tiers — et l'expérience MikroORM sur funecap montre des frictions concrètes (pas de lock de migration, isolation de test plus complexe).
- Mauvais : **deux stacks back dans l'agence.** Projets existants sur igo, nouveaux sur NestJS. À 5-6 personnes, le context-switching a un coût.
- Mauvais : **stabilité relative.** NestJS a 9 ans (2017). Express en a 14 et n'a quasi pas bougé. La couche d'abstraction NestJS au-dessus d'Express est un pari supplémentaire — si NestJS tombe, on retombe sur Express, exactement là où igo est déjà.
- Mauvais : **l'injection de dépendances est un outil de grande équipe.** À 5-6, on sait qui appelle quoi — la DI ajoute de l'indirection sans résoudre un problème qu'on a.

## Decision Outcome

**igo-next recommandé comme socle par défaut. NestJS reste une option évaluée au cas par cas.**

### Ce qui a orienté la recommandation

1. **L'ORM justifie le framework.** C'est le seul composant d'igo qu'on ne retrouve pas ailleurs avec la même qualité dans ce contexte. Le cache natif, les transactions isolées pour les tests, les migrations avec lock — ces acquis sont concrets et éprouvés. Perdre l'ORM pour adopter NestJS, c'est échanger un atout tangible contre un écosystème de confort.

2. **Express est le choix le plus stable du panel.** igo-next sur Express, c'est une couche de conventions sur une fondation de 14 ans. NestJS sur Express, c'est une couche d'abstraction supplémentaire. En cas de problème sur NestJS, on retombe sur Express — autant y être directement.

3. **La simplicité est un critère explicite.** « Pas de complexité pour rien » traverse tous les ADR. Un handler Express + un service + un modèle est plus simple qu'un module NestJS + un contrôleur + un service + un DTO + des décorateurs. Le LLM absorbe l'écriture, pas la relecture.

4. **La skill LLM comble l'écart d'assistance.** L'argument « le LLM ne connaît pas igo » est réel mais atténuable. Une skill qui documente les conventions, les patterns de l'ORM, les utilitaires de test rend le LLM compétent sur igo. Ce n'est pas théorique — c'est le même mécanisme que les CLAUDE.md par projet, à l'échelle du framework.

### Quand NestJS devient le meilleur choix

La recommandation igo-next n'est pas un verrou. NestJS se justifie si :

- **Le projet a besoin de modularisation de déploiement** — API, workers, cron dans la même base de code mais déployés séparément. igo peut le faire (un second point d'entrée `worker.js`) mais NestJS le rend naturel.
- **Le projet n'utilise pas l'ORM igo** — si les données viennent d'une API tierce ou d'un autre SGBD, le principal argument d'igo-next tombe.
- **L'équipe qui porte le projet connaît NestJS et pas igo** — forcer igo sur une équipe motivée par NestJS serait contre-productif.

La décision se prend **projet par projet**, pas une fois pour toutes.

### Prérequis : les évolutions igo-next

La recommandation igo-next **suppose que le travail d'évolution est fait** avant le premier greenfield. Sans le squelette API-first, le support TypeScript et la skill LLM, la comparaison est biaisée — on oppose un igo-legacy à un Nest prêt à l'emploi.

Ce travail est séquencé dans la feuille de route du socle igo.

### Investissement structurant : la skill LLM pour igo

Indépendante du choix de socle, cette skill bénéficie à **tous les projets** — existants et greenfield :

- Documentation des conventions igo (Model, Query, Schema, associations, cache, config).
- Patterns de test (dev.agent, dev.test, Factory, transactions).
- Patterns de routes et middleware.
- Erreurs courantes et leurs solutions.

C'est le même mécanisme que les skills Playwright ou frontend-design — un document structuré qui donne au LLM le contexte qu'il n'a pas dans son entraînement.

## Consequences

- Bon : **un seul socle back pour toute l'agence**, dans le cas par défaut. Pas de context-switching entre igo et NestJS.
- Bon : **l'ORM et ses acquis sont préservés** — cache, transactions isolées, migrations avec lock.
- Bon : **la skill LLM bénéficie à l'existant aussi** — les 5 projets en production sur igo s'améliorent.
- Neutre : **NestJS n'est pas fermé** — il reste éligible projet par projet, avec des critères explicites.
- Mauvais : **le travail d'évolution d'igo-next est un investissement** — squelette, TypeScript, skill. Il doit être fait en amont, pas au moment du greenfield.
- Mauvais : **le bus factor sur l'ORM reste.** Atténué par l'assistance LLM et la skill, pas résolu.

## Confirmation

**Cette décision est instruite, pas tranchée.** Elle sera actée au premier greenfield, en confrontant les critères ci-dessus au projet concret. Si le projet favorise NestJS (modularisation, pas de besoin ORM, équipe orientée Nest), la recommandation sera inversée — c'est pour ça que les critères sont explicites.

À douze mois du premier greenfield :
- **Le squelette igo-next existe-t-il et est-il utilisable ?** Si non, NestJS gagne par défaut — le travail d'évolution n'a pas été fait.
- **La skill LLM est-elle en place et efficace ?** Si non, l'écart d'assistance reste et pèse au quotidien.
- **L'équipe a-t-elle un avis après avoir utilisé le squelette ?** Le retour terrain vaut plus que l'analyse.

## More Information

C'est l'**axe 3** du [cadre de décision](../cadre-decision-stack-front.md), identifié dès le début comme différé. Les axes 1 et 2 (front) sont tranchés ; celui-ci est instruit et attend son terrain d'application. Les évolutions concrètes qu'igo-next doit intégrer sont séquencées dans la feuille de route du socle igo.
