# Organisation des sources front

**Statut** : accepté  
**Date** : 2026-08-24

## Context and Problem Statement

La [chaîne de build](chaine-de-build-du-front.md) a posé la coquille : un projet npm frère du back, dans le même dépôt, buildé par Vite. La [technologie](technologie-de-composants-front.md) et le [système de design](systeme-de-design.md) ont fixé React et shadcn/ui sur Tailwind. Reste à décider **comment les fichiers sont organisés à l'intérieur du projet front**, et quelles conventions régissent les composants, les données et le routage.

C'est un ADR de conventions, pas d'architecture — les décisions structurantes sont prises. Mais les conventions mal posées coûtent cher sur la durée : à 5-6 personnes, une dérive non cadrée se voit en six mois.

## Principes directeurs

1. **Organiser par fonctionnalité, pas par type.** La possession est par route (ADR architecture) — la structure du code la reflète. Une feature regroupe ses composants, hooks, appels API et types.
2. **La propriété prime sur le niveau d'abstraction.** Le vocabulaire de l'atomic design (atome, molécule, organisme) sert à discuter en revue de code, pas à nommer des dossiers. Ce qui structure l'arborescence, c'est le partage : partagé entre features → `components/` ; propre à une feature → dans la feature.
3. **Frontière de données explicite.** Un composant qui appelle `useQuery` ou `useMutation` est identifiable par son nom et par son emplacement. Tout le reste est pur — props only.
4. **Pas de complexité pour rien.** Pas de paquet d'état supplémentaire tant que React context ne suffit pas. Pas de Storybook tant que les tests de composants ne sont pas en place. Pas de schéma partagé front/back tant qu'igo n'est pas en TypeScript.

## Considered Options

### Organisation des fichiers — par fonctionnalité ou par type

| | Par type (`components/`, `hooks/`, `pages/` au premier niveau) | Par fonctionnalité (`features/stagiaires/` regroupe tout) |
|---|---|---|
| **Pour** | Familier, plat, pas de jugement sur « où couper » | Tout ce qui touche un écran est au même endroit ; supprimer une feature est un `rm -rf` |
| **Contre** | Les fichiers d'un écran sont mélangés avec tous les autres — tient à 20 fichiers, plus à 200 | Il faut décider ce qui est une « feature » vs ce qui est partagé |

**Par fonctionnalité retenu.** La possession par route est déjà décidée (ADR architecture) — la structure la reflète. À 5-6 personnes travaillant sur des projets clients différents, chacun travaille dans « son » espace la plupart du temps.

### Niveau d'abstraction — dossiers atomic design ou vocabulaire seul

Encoder la hiérarchie atomic design en dossiers (`atoms/`, `molecules/`, `organisms/`, `templates/`) rend le classement obligatoire à chaque fichier. En pratique, la frontière atome/molécule est ambiguë (un champ de formulaire label + input + erreur ?) et les reclassements déplacent des fichiers sans rien changer au comportement. shadcn fournit déjà les atomes dans `ui/`. **Retenu : le vocabulaire en revue de code, la propriété (partagé vs feature) dans l'arborescence.**

### Routage — React Router ou TanStack Router

TanStack Router offre un typage des routes à la compilation, mais React Router reste le standard de fait — base installée massive, documentation complète, connu de l'équipe. Le gain de type-safety ne justifie pas le coût d'apprentissage pour 5-6 personnes. **React Router retenu.**

### État client — React context ou bibliothèque dédiée

Zustand, Jotai ou Redux ajouteraient une dépendance et un modèle mental supplémentaire. TanStack Query couvre l'état serveur ; ce qui reste côté client pur est léger (préférences, wizard, sidebar). **React context retenu**, avec un seuil d'alerte explicite pour réévaluer (cf. section État client).

## Decision Outcome

### Structure de référence

```
projet/
  back/                      ← igo (inchangé)
  front/
    package.json
    vite.config.ts
    tailwind.config.ts       ← thème shadcn + jetons projet
    tsconfig.json
    index.html
    public/
    src/
      main.tsx               ← point d'entrée, providers
      routes.tsx             ← arbre de routes React Router
      components/
        ui/                  ← shadcn/ui — les atomes, copiés tels quels
        layout/              ← coquille de page, sidebar, header
        [compositions].tsx   ← molécules et organismes partagés entre features
      features/
        stagiaires/
          pages/             ← composants de route — INJECTENT les données
          sections/          ← blocs autonomes — INJECTENT les données
          components/        ← composants d'affichage — PURS
          hooks/             ← hooks métier propres à la feature
          api.ts             ← queries et mutations TanStack Query
          types.ts           ← types propres à la feature
        dispositifs/
          ...
      lib/
        api-client.ts        ← wrapper fetch typé, base URL, gestion d'erreurs
        query-client.ts      ← configuration TanStack Query
        utils.ts             ← helpers partagés
      hooks/                 ← hooks partagés (useDebounce, useMediaQuery…)
      types/                 ← types globaux (User, Session…)
```

**Une feature légère** (3-5 fichiers) n'a pas besoin de sous-dossiers — un fichier `page.tsx`, un `api.ts` et un `types.ts` à plat suffisent. Les sous-dossiers `pages/`, `sections/`, `components/` apparaissent quand la feature dépasse la dizaine de fichiers.

### Règle d'injection des données

**Deux types de fichiers peuvent appeler `useQuery` ou `useMutation`. Le reste est pur.**

| Emplacement | Peut fetch | Rôle |
|---|:--:|---|
| `features/xxx/pages/` | **Oui** | Composant de route — assemble les sections, peut charger les données de tête |
| `features/xxx/sections/` | **Oui** | Bloc autonome de la page — possède son jeu de données |
| `features/xxx/components/` | **Non** | Composant d'affichage pur — reçoit tout par props |
| `components/` (y compris `ui/`) | **Non** | Composant partagé pur — réutilisable sans dépendance au serveur |

**Le test de décision : est-ce une section ou un composant ?**

- Le bloc peut être retiré de la page sans casser le reste → **section** (il possède ses données).
- Retirer le bloc casserait l'affichage d'un voisin, ou le même bloc apparaît dans plusieurs features → **composant pur** (il reçoit ses données par props).

**Comment ça se traduit dans le code :**

```tsx
// features/dispositifs/pages/dispositif-page.tsx — ASSEMBLE
function DispositifPage() {
  const { id } = useParams()
  const { data: dispositif } = useDispositif(id)
  return (
    <>
      <PageHeader titre={dispositif.nom} />
      <DocumentsSection dispositifId={id} />
      <CommentairesSection dispositifId={id} />
    </>
  )
}

// features/dispositifs/sections/commentaires-section.tsx — POSSÈDE SES DONNÉES
function CommentairesSection({ dispositifId }: { dispositifId: string }) {
  const { data: commentaires } = useCommentaires(dispositifId)
  const ajouter = useAjouterCommentaire()
  return <CommentairesList commentaires={commentaires} onAjouter={ajouter.mutate} />
}

// features/dispositifs/components/commentaires-list.tsx — PUR
function CommentairesList({ commentaires, onAjouter }: Props) {
  // pas de useQuery, pas de useMutation — props only
}
```

**Cas limite : le formulaire.** Un formulaire qui possède sa soumission (`useMutation`) est une section — le nommer `XxxFormSection` rend l'intention visible. Si le même formulaire doit être réutilisé dans une autre feature, il remonte dans `components/` et redevient pur : il reçoit un `onSubmit`.

**Vérification mécanique.** La règle se vérifie par grep :

```bash
grep -r "useQuery\|useMutation" src/components/     # doit être vide
grep -r "useQuery\|useMutation" src/features/*/components/  # doit être vide
```

### Couche API

**TanStack Query** pour le cache serveur, les états de chargement, le rafraîchissement et les mutations. C'est la seule dépendance d'état ajoutée — elle est dans la liste des dépendances agnostiques recommandées par l'ADR technologie.

Les queries et mutations d'une feature vivent dans son `api.ts` :

```tsx
// features/stagiaires/api.ts
export function useStagiaires(dispositifId: string) {
  return useQuery({
    queryKey: ['stagiaires', dispositifId],
    queryFn: () => apiClient.get<Stagiaire[]>(
      `/api/dispositifs/${dispositifId}/stagiaires`
    ),
  })
}

export function useCreerStagiaire() {
  return useMutation({
    mutationFn: (stagiaire: CreerStagiairePayload) =>
      apiClient.post('/api/stagiaires', stagiaire),
  })
}
```

Le client HTTP (`lib/api-client.ts`) est un wrapper `fetch` minimal et typé — base URL relative (`/api`), gestion des erreurs HTTP, parsing JSON. Pas d'Axios : `fetch` est natif et suffisant.

### Routage

**React Router** (cf. Considered Options). Configuration centralisée dans `routes.tsx`, avec lazy-loading par feature :

```tsx
// src/routes.tsx
export const routes = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/stagiaires', lazy: () => import('./features/stagiaires/pages/stagiaires-page') },
      { path: '/dispositifs/:id', lazy: () => import('./features/dispositifs/pages/dispositif-page') },
    ],
  },
])
```

### État client

**React context et `useReducer`** (cf. Considered Options). Seuil d'alerte : si un context dépasse 5-6 valeurs ou déclenche des re-renders visibles sans rapport, évaluer Zustand. Pas avant.

### Types front ↔ back

**Dupliqués côté front**, en TypeScript. igo n'étant pas en TypeScript, un partage structurel n'a pas de sens aujourd'hui.

- Les types d'une feature vivent dans son `types.ts`.
- Les types transversaux (User, Session, réponses d'API communes) vivent dans `src/types/`.

**Validation** : Zod côté front pour les entrées utilisateur, conformément à l'[ADR validation](strategie-de-validation.md). Les schémas Zod vivent à côté des types qu'ils décrivent. Zod est utilisable en JavaScript pur — si igo adopte la validation Zod plus tard, les schémas pourront converger sans que le back passe à TypeScript.

### Storybook

**Différé.** Le cas d'usage — développer un composant en isolation sans serveur ni données — est réel et exprimé par l'équipe. Mais il se traite d'abord par les tests de composants avec Vitest + Testing Library, qui exercent un composant en isolation avec un coût de maintenance moindre.

Storybook sera reconsidéré si :
- Le besoin de documentation visuelle dépasse ce que les tests et le rechargement à chaud couvrent.
- Un second développeur exprime le même besoin de développer sans serveur, et les tests de composants ne le satisfont pas en pratique.

## Consequences

- Bon : **la structure reflète le métier**, pas l'outillage. Un développeur qui cherche « les commentaires du dispositif » sait où regarder — `features/dispositifs/`.
- Bon : **la frontière de données est visible** dans les noms de fichiers (`XxxSection` fetch, `XxxCard` ne fetch pas) et vérifiable par grep.
- Bon : **supprimer une feature est un `rm -rf`** sur son dossier, plus le retrait de sa route. Pas de chasse aux composants éparpillés dans `components/`, `hooks/`, `api/`.
- Bon : **aucune dépendance d'état supplémentaire.** TanStack Query est la seule addition au-dessus de React.
- Bon : **le vocabulaire atomic design survit** dans les discussions et les revues de code — « ça c'est un organisme, il n'a rien à faire dans `ui/` » — sans imposer d'arborescence rigide.
- Neutre : **les types dupliqués dérivent silencieusement.** La validation Zod attrape les désalignements à l'exécution, pas à la compilation. À réévaluer si igo passe à TypeScript.
- Mauvais : **la frontière page/section demande un jugement** au premier cas ambigu — le formulaire en est l'exemple type. Le test de bon sens est posé, mais chaque développeur le calibrera un peu différemment. Le grep de vérification est le filet.

## Confirmation

Comment on saura, dans six mois, si les conventions tiennent :

- **Proportion de `useQuery`/`useMutation` hors pages et sections** — le grep ci-dessus suffit. Au-dessus de 10-15 %, la règle n'est pas respectée ou pas adaptée.
- **Taille du dossier `components/` partagé vs les features** — si le dossier partagé grossit plus vite que les features, les composants remontent trop tôt et la logique feature se dilue.
- **Temps d'onboarding** sur la structure — un nouveau développeur trouve-t-il ses fichiers sans demander ?
- **Nombre de features dont les sous-dossiers sont vides ou à un seul fichier** — signe que la structure est trop rigide pour la taille réelle des features.

