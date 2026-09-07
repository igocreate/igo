# {project.name}

API JSON igo + SPA React dans un seul dépôt. TypeScript, Node 24, pnpm.

**Les conventions de code sont dans `api/CLAUDE.md` et `front/CLAUDE.md`.** Ce
fichier ne couvre que ce qui concerne les deux.

## Commandes

```bash
pnpm dev           # api :3000 + front :5173
pnpm build         # api/dist + front/dist
pnpm lint          # oxlint sur les deux
pnpm typecheck
pnpm test          # tests back et front
pnpm test:e2e      # Playwright contre le build
pnpm migrate
```

Une commande ciblée passe par un filtre : `pnpm --filter ./api test`.

## Le contrat front/back

Le back expose du JSON sous `/api`, le front le consomme par des **URL
relatives**. Jamais de base URL absolue — c'est ce qui permet au même build de
tourner sur tous les environnements.

En développement, Vite proxifie `/api` vers igo ; en production, c'est nginx. Le
navigateur ne voit qu'une origine dans les deux cas, donc le cookie de session
passe sans CORS.

**Les erreurs suivent RFC 9457.** Le back les émet avec `sendProblem`, le front
les lit avec `ApiError` : `fieldError(champ)` donne le message à afficher sous
un input. Le client teste `type` et `errors[].code`, jamais les libellés.

**Les types du front reflètent les DTO du back**, écrits à la main. S'ils
dérivent, ce sont les tests de feature qui le montrent.

## Ajouter un domaine

Les deux côtés se répondent :

```
api/app/api/<domaine>/    routes, controller, dto
front/src/features/<domaine>/  api.ts, types.ts, pages, sections, components
```

Le back sert d'abord — le front consomme un contrat qui existe.

## Les tests

| Niveau             | Où                        | Quand                         |
| ------------------ | ------------------------- | ----------------------------- |
| Intégration back   | `api/test/`              | tout contrôleur API           |
| Composant, feature | `front/src/**/*.test.tsx` | tout composant, toute section |
| E2E                | `e2e/`                    | chemins critiques seulement   |

Les E2E tournent contre le **build**, pas le serveur de développement. Ils sont
lents : tout ce qui peut être couvert plus bas doit l'être plus bas.

## Commits

[Conventional Commits](https://www.conventionalcommits.org), vérifiés par un
hook. Le pre-commit passe oxlint sur les fichiers indexés.

Un commit qui touche les deux côtés est normal — c'est l'intérêt du dépôt
unique : front et back restent cohérents par construction.
