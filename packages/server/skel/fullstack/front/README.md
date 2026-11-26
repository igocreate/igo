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
    ui/                     shadcn/ui — copiés, donc modifiables
    form/                   champs partagés : libellé, aide et erreur reliés
    layout/                 coquille de page, frontières d'erreur
  features/<domaine>/
    pages/                  composants de route — PEUVENT fetch
    sections/               blocs autonomes — PEUVENT fetch
    components/             affichage — PURS, props only
    api.ts                  queries et mutations TanStack Query
    types.ts                types du DTO de la feature
    schemas.ts              schémas zod des formulaires
  lib/
    api-client.ts           wrapper fetch typé, erreurs RFC 9457
    form.ts                 erreurs de champ de l'API, aria-describedby
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

**La surface se valide côté client, le métier côté serveur.** Le schéma zod du
formulaire, dans `schemas.ts`, refuse avant l'envoi toute saisie mal formée :
obligatoire, format, longueur, cohérence entre champs. L'API revalide tout. Ce
qu'elle seule peut refuser (unicité, état, droits) s'affiche sous le champ
qu'elle nomme, posé par `applyFieldErrors` (`lib/form.ts`), focus sur le
premier.

**Un formulaire s'écrit avec React Hook Form**, son schéma branché par
`zodResolver` et `mode: 'onTouched'` : l'erreur apparaît quand on quitte le
champ, puis suit la saisie. Les champs viennent de `components/form/`, qui
relient libellé, aide et erreur pour les lecteurs d'écran — c'est ce câblage,
et non la gestion de l'état, qui justifie la bibliothèque. `useActionState`
suffit là où il n'y a ni validation ni erreurs par champ (une recherche, un
filtre) ; dès qu'un champ se valide, le formulaire prend React Hook Form.

**Les types de la feature reflètent le DTO du back.** Ils sont écrits à la main :
si les deux dérivent, ce sont les tests de feature qui le montrent.

**Un message d'erreur nomme la classe du problème, pas l'occurrence.** Grafana
regroupe les erreurs par message : un identifiant, une durée ou un horodatage
dans le texte fait autant de groupes que d'appels, et aucune alerte ne peut plus
rien compter. Les détails passent en contexte.

```ts
throw new Error(`Animal ${id} introuvable`);                     // un groupe par animal
reportError(new Error('Animal introuvable'), { animalId: id });  // un seul groupe
```

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

## Sécurité

La politique de sécurité de contenu est posée en `<meta>` par `vite.config.ts`,
stricte au build et assouplie en développement pour le préambule de Vite et
HMR. Une police, un CDN ou une API tierce ajoutés au front s'ajoutent à la
liste — la console le dit dès `pnpm dev` (« Refused to load … »).

Ce qu'une `<meta>` ne porte pas revient à nginx : `frame-ancestors` (ou
`X-Frame-Options`) et HSTS. Pas de `report-uri` non plus : un projet qui veut
remonter les violations copie la même politique dans nginx.

## Données personnelles

Faro envoie erreurs, Web Vitals et appels réseau, avec l'URL de la page et le
user-agent ; le collecteur voit l'adresse IP. C'est du traitement technique — à
mentionner dans la politique de confidentialité au titre de l'intérêt légitime.

L'identifiant de session est écrit en `sessionStorage` (`persistent: false`) :
propre à l'onglet, effacé à sa fermeture. C'est une écriture dans le terminal
au sens de l'article 82 de la loi Informatique et Libertés ; l'exemption de
consentement tient à la finalité, pas à la durée, et c'est au projet d'en
décider. Le collecteur refuse les envois sans lui : la session n'est pas
optionnelle, seule sa persistance l'est.

## Système de design

[shadcn/ui](https://ui.shadcn.com) sur Tailwind. Ses composants ne sont pas une
dépendance : ils se copient dans `src/components/ui/` et deviennent du code du
projet, qu'on relit, qu'on modifie et qu'on formate comme le reste. Trois sont
déjà là — `button`, `input`, `label` ; les autres s'ajoutent à la demande :

```bash
pnpm dlx shadcn@latest add select dialog table
```

Une reprise à faire après chaque ajout : la CLI importe `cn` d'un paquet npm
`cn` qu'elle installe — remplacer par `@/lib/utils` et retirer le paquet.

**Un seul système de jetons.** Les couleurs, rayons et espacements viennent de
`src/index.css` : `:root` porte les valeurs, `@theme inline` les expose à
Tailwind. Un projet qui a sa charte y remplace les valeurs, pas les noms. Une
classe de couleur brute (`text-slate-600`) dans un composant est un second
système qui commence — c'est `text-muted-foreground` qu'il faut.

C'est une recommandation forte, pas une obligation : un projet qui écrit ses
composants à la main ou part d'ailleurs les range au même endroit et expose ses
jetons de la même façon.
