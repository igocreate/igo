# Feuille de route du socle igo

**Date** : 2026-08-24  
**Portée** : évolutions du framework igo — serveur, ORM, outillage de test  
**Ce document séquence, il ne décide pas.** Les arbitrages sont dans les ADR.

## Deux trajectoires, un seul socle

| | Refonte front (projet existant) | Greenfield (projet neuf) |
|---|---|---|
| Le back | igo actuel, inchangé structurellement | igo-next — version allégée, API-first |
| Ce qui change | Ajout de routes API JSON (`@api/`) à côté des routes dust | Pas de dust, pas de component, pas de webpack |
| Prérequis | Conventions API + error handler JSON + validation Zod | Tout ce qui précède + squelette + TypeScript + skill LLM |

Les améliorations sont cumulatives : ce qui sert aux refontes sert aussi aux greenfield.

## Phase 1 — Maintenant (avant la première refonte front)

| Action | Quoi | Effort |
|---|---|---|
| **`@igojs/component` en maintenance** | Acte explicite — les 6 écrans certigo sont supportés, pas étendus | Décision |
| **Convention de routes API** | Les routes JSON vivent dans `app/api/`, alias `@api/` | Convention |
| **Réponses d'erreur JSON** | Le error handler d'`@igojs/server` détecte les requêtes API et répond en JSON au lieu de rendre du dust | Faible |
| **Middleware de validation Zod** | Middleware générique dans `@igojs/server` — `validate(schema)` sur les routes API | Faible |

## Phase 2 — Première refonte front

| Action | Quoi | Effort |
|---|---|---|
| **DTOs sur les routes API** | Chaque contrôleur API sérialise via un DTO — le front ne voit jamais un modèle ORM brut | Progressif |
| **TypeScript progressif** | `allowJs: true` dans le projet applicatif, nouveaux fichiers en `.ts` | Moyen (config) |
| **Sentry côté front** | SDK `@sentry/react`, capture des erreurs et Web Vitals (sites grand public) | Faible |
| **Sentry côté back** (si adopté pour le front) | `@sentry/node` instrumente Express, corrélation front/back | Faible |

## Phase 3 — Avant le premier greenfield

| Action | Quoi | Effort |
|---|---|---|
| **igo-next publié** | Nouvelle majeure : retirer dust, component, webpack, forms de l'export | Faible |
| **Squelette API-first** | `skel/api` — structure par feature, TypeScript, Zod, Vitest | Moyen |
| **Déclarations TypeScript** | `.d.ts` sur l'API publique de `@igojs/server` et `@igojs/db` | Moyen |
| **Support Vitest** | `dev.vitest()` — adaptateur des hooks de transaction pour Vitest | Faible |
| **Skill LLM pour igo** | Documentation des conventions, patterns ORM, utilitaires de test, erreurs courantes | Moyen |

## Phase 4 — Premier greenfield

| Action | Quoi | Effort |
|---|---|---|
| **Évaluer igo-next vs NestJS** | Sur le projet concret, avec les critères de l'ADR socle back | Décision |
| **Retour terrain** | L'équipe valide ou corrige les conventions après le premier projet | Retex |

## Phase 5 — Quand le crash → mail est remplacé

| Action | Quoi | Effort |
|---|---|---|
| **Retirer le crash → mail** | Sentry est le seul filet d'alerting, crash → mail supprimé | Faible |
| **Supprimer `process.exit(1)`** | Le error handler capture sans tuer le process — meilleur pattern | Moyen (à tester soigneusement) |

## Ce qui n'est pas séquencé

- **Migration Joi → Zod sur l'existant** — pas planifiée. Les nouvelles routes utilisent Zod, les anciennes gardent Joi. Les deux cohabitent.
- **Migration Mocha → Vitest sur l'existant** — pas planifiée. Mocha reste sur les projets existants, Vitest sur les greenfield.
- **Migration des templates dust** — projet par projet, au rythme des refontes. Pas de big bang.
