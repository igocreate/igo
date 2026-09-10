# {project.name} — front

SPA React consommant l'API JSON d'igo. Vite, TypeScript, Node 24.

## Commandes

```bash
pnpm dev          # http://localhost:5173, proxy /api vers le back
pnpm test         # vitest + testing library + msw
pnpm lint         # oxlint
pnpm format       # oxfmt
pnpm typecheck    # tsc --noEmit
pnpm build        # -> dist/
```

`pnpm dev` à la racine lance le back et le front ensemble — c'est la façon
normale de travailler. Le proxy `/api` vise `http://127.0.0.1:3000`.

## Structure

```
src/
  main.tsx                  point d'entrée, providers
  observability.ts          initialisation, importée en premier
  routes.tsx                arbre de routes, lazy par feature
  components/
    ui/                     composants d'interface bas niveau — purs, à créer
    layout/                 coquille de page, frontières d'erreur
  features/<domaine>/
    pages/                  composants de route — PEUVENT fetch
    sections/               blocs autonomes — PEUVENT fetch
    components/             affichage — PURS, props only
    api.ts                  queries et mutations TanStack Query
    types.ts                types de la feature
  lib/
    api-client.ts           wrapper fetch typé, erreurs RFC 9457
    report-error.ts         signaler une erreur rattrapée
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

**Les deux frontières d'erreur ne sont pas redondantes** : celle de `main.tsx`
capte le rendu, l'`errorElement` de `routes.tsx` capte ce que react-router
intercepte lui-même (route lazy, `loader`). Retirer l'une rend ses erreurs
invisibles.

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

## Accessibilité

Les composants se construisent sur les rôles ARIA, pas sur des `div` : c'est ce
qui rend un écran utilisable au clavier et au lecteur d'écran, et c'est aussi ce
qui rend les tests lisibles — `getByRole('button', { name: 'Envoyer' })` décrit
l'intention là où un sélecteur CSS décrit le balisage.

Trois points qu'axe ne détecte pas et qui reviennent :

- un bouton dont le libellé est une icône a besoin d'un `aria-label` ;
- un message d'erreur a besoin de `role="alert"` pour être annoncé ;
- un compteur qui change a besoin d'`aria-live` pour l'être aussi.

Les composants copiés de shadcn/ui portent leurs `aria-label` **en anglais** :
les traduire fait partie de la reprise.

## Système de design

Tailwind est installé, sans bibliothèque de composants. `src/components/ui/`
accueille les composants d'interface bas niveau — bouton, champ, sélecteur :
purs, sans accès aux données, réutilisables partout.

[shadcn/ui](https://ui.shadcn.com) est la recommandation pour les obtenir : ses
composants se copient dans ce dossier et deviennent du code du projet, qu'on
peut relire et modifier. **C'est une recommandation, pas une obligation** — un
projet qui écrit les siens à la main, ou qui part d'une autre bibliothèque,
range ses composants au même endroit.
