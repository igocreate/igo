# {project.name} — front

SPA React consommant l'API JSON d'igo. Vite, TypeScript, Node 24, pnpm.

## Commandes

```bash
pnpm dev          # http://localhost:5173, proxy /api vers le back
pnpm test         # vitest + testing library + msw
pnpm lint         # oxlint
pnpm format       # oxfmt
pnpm typecheck    # tsc --noEmit
pnpm build        # -> dist/
```

Le back doit tourner en parallèle. `API_URL` pointe le proxy ailleurs que sur
`http://127.0.0.1:3000`.

## Structure

```
src/
  main.tsx                  point d'entrée, providers
  routes.tsx                arbre de routes, lazy par feature
  components/
    ui/                     composants copiés (shadcn) — purs, à créer
    layout/                 coquille de page
  features/<domaine>/
    pages/                  composants de route — PEUVENT fetch
    sections/               blocs autonomes — PEUVENT fetch
    components/             affichage — PURS, props only
    api.ts                  queries et mutations TanStack Query
    types.ts                types de la feature
  lib/
    api-client.ts           wrapper fetch typé, erreurs RFC 9457
  test/                     handlers MSW, helper de rendu
```

## Conventions

**Seuls `pages/` et `sections/` appellent `useQuery` ou `useMutation`.** Tout le
reste reçoit ses données par props. Un bloc retirable sans casser ses voisins
possède ses données — c'est une section ; un bloc réutilisé ailleurs est un
composant pur.

Ça se vérifie :

```bash
grep -r "useQuery\|useMutation" src/components/            # doit être vide
grep -r "useQuery\|useMutation" src/features/*/components/ # doit être vide
```

**Les URL d'API sont relatives** (`/api/…`). Jamais de base URL absolue : c'est
ce qui permet au même build de tourner sur tous les environnements.

**L'état serveur appartient à TanStack Query**, pas à un `useState` synchronisé
par `useEffect`. L'état purement client passe par React context tant qu'il reste
léger.

**Les états loading et error sont explicites** dans les pages et sections. Pas
de composant qui suppose que les données sont là.

**Le serveur est l'autorité sur la validation.** La validation côté client est
un confort ; les erreurs du serveur s'affichent telles quelles, par champ, via
`ApiError.fieldError(champ)`.

**Les types de la feature reflètent le DTO du back.** Ils sont écrits à la main :
si les deux dérivent, ce sont les tests de feature qui le montrent.

## Tests

MSW intercepte au niveau réseau, donc le vrai `apiClient` tourne dans les tests.

| Où | Niveau | Ce qu'on simule |
|---|---|---|
| `components/` | rendu avec props | rien |
| `sections/`, `pages/` | rendu avec providers | le réseau (MSW) |

Un test de feature couvre le cas nominal, l'erreur serveur, et la validation.

## Commits

[Conventional Commits](https://www.conventionalcommits.org), vérifié par un hook.
Le hook de pre-commit passe oxlint sur les fichiers indexés.

Quand le travail est rattaché à un ticket, son identifiant ouvre le sujet :
`feat(books): [PROJ-123] paginer la liste`. L'historique se lit alors sans
ouvrir les commits. Le hook ne l'exige pas : sans ticket, on s'en passe.

## Système de design

Tailwind est installé, sans bibliothèque de composants.
[shadcn/ui](https://ui.shadcn.com) est la recommandation — ses composants se
copient dans `src/components/ui/` et deviennent du code du projet. C'est un
choix, pas une obligation.
