# {project.name} — front

SPA React servie en assets statiques, consommant l'API JSON d'igo.

## Démarrer

```bash
pnpm install
pnpm dev           # http://localhost:5173, proxy /api vers le back
pnpm test          # vitest + testing library + msw
pnpm lint          # oxlint
pnpm format        # oxfmt
pnpm typecheck
pnpm build         # -> dist/
pnpm test:e2e      # Playwright contre le build
```

Le back doit tourner en parallèle (`pnpm dev` côté igo, port 3000 par défaut).
`API_URL` pointe le proxy ailleurs :

```bash
API_URL=http://127.0.0.1:3111 pnpm dev
```

## Le proxy

En développement, Vite proxifie `/api` vers igo. Le navigateur ne voit qu'une
seule origine : **le cookie de session passe sans CORS**, et les URL d'API
restent relatives — le même build tourne ensuite sur tous les environnements
sans être recompilé.

## Structure

```
src/
  main.tsx                    point d'entrée, providers
  routes.tsx                  arbre de routes, lazy par feature
  components/
    layout/                   coquille de page
  features/
    books/
      pages/                  composants de route — PEUVENT fetch
      sections/               blocs autonomes — PEUVENT fetch
      components/             affichage — PURS, props only
      api.ts                  queries et mutations TanStack Query
      types.ts                types de la feature
  lib/
    api-client.ts             wrapper fetch typé, erreurs RFC 9457
    query-client.ts           configuration TanStack Query
  test/
    handlers.ts               handlers MSW par défaut
    render.tsx                rendu avec providers
```

## La règle d'injection des données

**Seuls `pages/` et `sections/` appellent `useQuery` ou `useMutation`.** Tout le
reste reçoit ses données par props.

Un bloc qu'on peut retirer sans casser ses voisins possède ses données → c'est
une **section**. Un bloc réutilisé ailleurs, ou dont le retrait casserait
l'affichage → c'est un **composant pur**.

Ça se vérifie :

```bash
grep -r "useQuery\|useMutation" src/components/            # doit être vide
grep -r "useQuery\|useMutation" src/features/*/components/ # doit être vide
```

## Les erreurs

Le back renvoie du [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457). `ApiError`
expose le document, et `fieldError(champ)` le message à afficher sous un input :

```tsx
const error = mutation.error instanceof ApiError ? mutation.error : null;
{error?.fieldError('title') && <p role="alert">{error.fieldError('title')}</p>}
```

La validation de surface côté client est un agrément d'usage ; **le serveur
reste l'autorité**, et ses erreurs s'affichent telles quelles.

## Les tests

MSW intercepte au niveau réseau, donc le vrai `apiClient` tourne dans les
tests — changer de wrapper HTTP ne les casse pas.

| Où | Niveau | Ce qu'on simule |
|---|---|---|
| `components/` | rendu avec props | rien |
| `sections/`, `pages/` | rendu avec providers | le réseau (MSW) |
| `e2e/` | navigateur réel, contre le build | rien — l'API tourne vraiment |

`pnpm test:e2e` sert le build et proxifie `/api`, comme nginx en production.

**L'API doit tourner.** Elle vit dans le même dépôt, mais le squelette ne sait
pas comment la démarrer — renseigner `E2E_API_COMMAND` dans
`playwright.config.ts` une bonne fois :

```ts
const API_COMMAND = process.env.E2E_API_COMMAND ?? 'pnpm --filter ./back start';
```

Playwright la démarre alors avant les tests et l'arrête après. Sinon, la lancer
soi-même et pointer `API_URL` dessus :

```bash
API_URL=http://127.0.0.1:3000 pnpm test:e2e
```

Les seeds et l'authentification sont l'affaire du projet : un squelette ne peut
pas les deviner. Le job E2E de la CI est désactivé tant que ce câblage n'est pas
fait.

## Le système de design

Tailwind est installé, sans bibliothèque de composants. [shadcn/ui](https://ui.shadcn.com)
est la recommandation — ses composants se copient dans `src/components/ui/`,
projet par projet. C'est un choix, pas une obligation.
