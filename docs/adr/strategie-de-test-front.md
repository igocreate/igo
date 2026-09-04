# Stratégie de test front

**Statut** : accepté  
**Date** : 2026-08-24

## Context and Problem Statement

La testabilité est pondérée **5** dans l'ADR d'architecture — c'est le critère, avec le coût de framework, qui a tranché en faveur du front à composants. Aujourd'hui, **aucun test de composant n'existe côté front**. Le seul filet est une poignée de tests E2E Playwright, trop lourds pour être nombreux, qui tiennent lieu de tests unitaires et de composants.

L'[organisation des sources](organisation-des-sources-front.md) facilite la mise en œuvre : les composants purs (props only) se testent sans mock, les sections se testent avec une API simulée, et la structure par feature place les tests à côté du code qu'ils vérifient.

La question n'est pas « faut-il tester » — c'est tranché. C'est **quoi tester, à quel niveau, avec quels outils, et dans quel ordre**.

## Principes directeurs

1. **Tester le comportement, pas l'implémentation.** Un test vérifie ce que l'utilisateur voit et ce qui se passe quand il agit — pas la structure interne du composant, pas le nombre de renders, pas l'arbre de hooks.
2. **Chaque niveau a son rôle — pas de duplication.** Si un comportement est couvert par un test de composant, il n'a pas besoin d'un E2E. L'objectif est de faire **redescendre** la vérification au niveau le plus bas qui la porte.
3. **Progressif.** L'équipe part de zéro. La stratégie doit produire de la valeur dès le premier test, pas après trois semaines de mise en place.
4. **Collocated.** Les tests vivent à côté du code qu'ils testent — dans la feature, pas dans un dossier `__tests__/` racine.

## Considered Options

### Runner de tests : Vitest vs Jest

Jest fonctionne mais exige sa propre configuration de transforms, de résolution de modules et de mocks — un deuxième pipeline à côté de Vite. **Vitest retenu** : même configuration, même résolution, rechargement à chaud en mode watch, et API quasi identique à Jest.

### Simulation d'API : MSW vs mock du apiClient

Mocker le wrapper `fetch` est plus rapide à écrire mais couple les tests à l'implémentation du client HTTP. **MSW retenu** : le code de production tourne tel quel, un changement de wrapper ne casse pas les tests, et les handlers servent aussi en mode développement sans serveur (cf. « Outils » ci-dessous).

### Objectif de couverture : pourcentage de lignes vs règle par fichier

Un seuil global (80 % de lignes) pousse à écrire des tests de remplissage sur du code trivial. **Règle par fichier retenue** : la mesure utile est la proportion de fichiers `pages/` et `sections/` ayant un `.test.tsx` — elle cible l'effort là où les bugs de câblage apparaissent.

### Storybook d'emblée vs différé

Storybook permet de développer un composant en isolation sans serveur. Vitest + Testing Library couvre le même besoin (monter un composant avec des props, vérifier le rendu) avec moins d'infrastructure. MSW couvre le mode développement sans serveur. **Différé** : à reconsidérer quand la base de tests composants sera en place et si le besoin de documentation visuelle persiste.

## Decision Outcome

### Les quatre niveaux de test

| Niveau | Outil | Ce qu'il vérifie | Vitesse | Priorité |
|---|---|---|---|---|
| **Unitaire** | Vitest | Logique pure : utils, hooks custom, schémas Zod | ~1 ms | Quand la logique branche |
| **Composant** | Vitest + Testing Library | Un composant rendu avec des props — affichage et interactions | ~10-50 ms | **Haute — c'est la zone morte** |
| **Feature** | Vitest + Testing Library + MSW | Une section ou page complète, API simulée au niveau réseau | ~50-200 ms | **Haute** |
| **E2E** | Playwright | Un parcours utilisateur complet, navigateur réel | ~1-10 s | Chemins critiques seulement |

**La priorité est aux niveaux composant et feature.** C'est la zone morte d'aujourd'hui, et c'est là que le ratio valeur/coût est le meilleur. Le but est d'inverser la pyramide actuelle : peu d'E2E ciblés, beaucoup de tests rapides.

### Correspondance avec l'organisation des sources

| Zone du code | Type de test | Ce qu'on mocke |
|---|---|---|
| `components/ui/` (shadcn) | **Pas testés par l'équipe** — code tiers copié | — |
| `components/` (compositions partagées) | **Composant** — rendu avec props | Rien — le composant est pur |
| `features/xxx/components/` | **Composant** — idem | Rien — le composant est pur |
| `features/xxx/sections/` | **Feature** — rendu avec API simulée | Les appels réseau (MSW) |
| `features/xxx/pages/` | **Feature** — vérifie l'assemblage | Les appels réseau (MSW) |
| Parcours critiques transverses | **E2E** — navigateur réel | Rien |

La séparation composants purs / sections de l'ADR organisation rend la stratégie mécanique : **pur → pas de mock ; section/page → MSW.**

### Règle : qu'est-ce qui doit être testé

**Tout nouveau fichier dans `pages/` ou `sections/` est accompagné d'au moins un test.** C'est là que les données entrent et que les bugs de câblage apparaissent. Pas de dérogation.

Les composants purs dans `components/` sont testés **quand ils contiennent du comportement** : logique conditionnelle, interactions utilisateur, états dérivés. Un composant qui ne fait que rendre des props dans du JSX ne justifie pas un test dédié — le test de la section qui l'utilise le couvre.

Les utilitaires, hooks custom et schémas Zod sont testés **quand ils contiennent un branchement**. Un `formatDate()` linéaire ne justifie pas un test. Un `parseReponseApi()` avec des cas d'erreur, si.

**Sur le code existant** : pas de rétro-écriture. La règle s'applique au code nouveau. Quand on modifie du code existant, on ajoute un test pour la modification — règle du boy-scout.

### Ce qu'un test de composant vérifie — et ne vérifie pas

**Vérifie :**
- Ce qui est affiché pour des props données — rendu attendu, cas vide, cas d'erreur, cas limite.
- Ce qui se passe quand l'utilisateur agit — clic, saisie, soumission.
- Les callbacks reçus par props — `onSubmit` appelé avec les bonnes valeurs.

**Ne vérifie pas :**
- Le style — couleur, taille, espacement. C'est le travail de la revue visuelle.
- La structure interne — nombre de `div`, ordre des hooks, nombre de re-renders.
- Les composants shadcn (`ui/`) — testés en amont par le projet shadcn.

### Ce qu'un test E2E couvre

Les **parcours critiques**, définis par leur impact métier : inscription d'un stagiaire, soumission d'un dossier, validation d'une étape. Chaque parcours est un scénario bout en bout, du clic à la vérification en réponse.

**Pas de E2E pour valider un composant en isolation.** Règle de pouce : si le test peut tourner sans navigateur, il ne doit pas être un E2E.

Convention existante maintenue : **les POMs exposent des locators, les assertions restent dans les fichiers de test.**

### Outils

**Vitest** — retenu pour les raisons exposées en Considered Options.

**React Testing Library** — teste le DOM tel que l'utilisateur le voit. Requêtes par rôle (`getByRole`), par texte (`getByText`), par label (`getByLabelText`). **Pas de requêtes par sélecteur CSS ni par `data-testid` sauf quand aucune requête accessible ne convient.** L'accessibilité devient un sous-produit des tests.

**MSW (Mock Service Worker)** — intercepte les appels `fetch` au niveau réseau pour les tests de feature. Les mêmes handlers servent aussi en **mode développement sans serveur**. Voir Considered Options pour le comparatif avec le mock du `apiClient`.

**Playwright** — déjà en place pour les E2E, conservé. Seule addition envisagée : `axe-playwright` pour attraper les régressions d'accessibilité sur les parcours critiques.

### Où vivent les tests

Collocated, suffixe `.test.tsx` (ou `.test.ts` pour les unitaires) :

```
features/dispositifs/
  sections/
    commentaires-section.tsx
    commentaires-section.test.tsx     ← test de feature (MSW)
  components/
    commentaire-card.tsx
    commentaire-card.test.tsx         ← test de composant (si comportement)
  api.ts
  types.ts
```

Les fixtures et factories partagées vivent dans `src/test/` :

```tsx
// src/test/factories.ts
export function creerStagiaire(surcharges?: Partial<Stagiaire>): Stagiaire {
  return { id: '1', nom: 'Doe', prenom: 'Jane', ...surcharges }
}
```

Les handlers MSW partagés vivent dans `src/test/handlers/` — un fichier par domaine d'API, réutilisable entre tests et mode développement sans serveur.

Les E2E Playwright restent dans leur arborescence existante, séparés du code source.

### Quand les tests tournent

| Moment | Ce qui tourne | Bloque |
|---|---|---|
| En développement | Vitest en mode watch sur les fichiers modifiés | Non |
| Avant commit (hook pre-commit) | `vitest related` — les tests touchés par le diff | Le commit |
| Sur PR (CI) | Suite Vitest complète + Playwright sur les parcours critiques | Le merge |

### Accessibilité

Deux niveaux, du moins cher au plus exigeant :

1. **Testing Library par construction.** Les requêtes par rôle (`getByRole('button')`, `getByLabelText('Nom')`) échouent si le composant n'expose pas les rôles ARIA attendus. C'est le filet de base, et il ne coûte rien de plus que d'écrire les tests correctement.
2. **axe-playwright sur les E2E.** Un appel `checkA11y()` ajouté aux parcours critiques existants attrape les violations WCAG sans écrire de test supplémentaire. Coût d'ajout : une ligne par test.

Aucun des deux ne remplace un audit RGAA, mais ils empêchent les régressions les plus courantes de passer.

## Consequences

- Bon : **la testabilité, critère à 5, devient effective.** Le premier test de composant peut s'écrire en une heure, sur un composant pur avec des props — pas de configuration serveur, pas de base de données.
- Bon : **les tests de composant couvrent ce que les E2E couvraient mal** — le comportement d'un composant dans ses cas limites, en millisecondes au lieu de secondes.
- Bon : **les requêtes par rôle de Testing Library forcent l'accessibilité** — un composant non accessible est un composant difficile à tester par cette méthode.
- Bon : **MSW sert deux usages** — les tests de feature et le développement sans serveur — ce qui réduit l'argument pour Storybook sans le fermer.
- Bon : **pas de couverture chiffrée imposée** — voir Considered Options pour le raisonnement.
- Neutre : **l'investissement initial est faible** — Vitest, Testing Library et MSW se configurent en une demi-journée. Le coût est dans l'apprentissage, pas dans l'outillage.
- Mauvais : **la règle « tout nouveau page/section a un test » ralentit les premières semaines**, le temps que l'équipe acquière le réflexe. C'est le coût d'entrée assumé.
- Mauvais : **les handlers MSW sont du code à maintenir.** Chaque endpoint simulé doit refléter le contrat de l'API. Si l'API change et que le handler ne suit pas, le test passe mais la feature est cassée. La validation Zod côté front est le second filet.

## Confirmation

Comment on saura, dans douze mois, si la stratégie fonctionne :

- **Proportion de fichiers `pages/` et `sections/` avec un `.test.tsx` associé** — mesure directe de la règle. Cible : 100 % sur le code nouveau.
- **Part de la couverture qui ne repose plus sur l'E2E** — l'objectif est d'inverser la pyramide.
- **Temps d'exécution de la suite Vitest** — si elle dépasse 30 secondes, les tests sont trop couplés ou trop lourds.
- **Nombre de bugs de production qui auraient été attrapés par un test de composant** — mesure rétrospective sur les incidents.

## More Information

La séparation pages/sections/composants purs de l'ADR organisation des sources front correspond directement aux niveaux de test : pur → pas de mock, section/page → MSW.

Les tests de régression visuelle (comparaison de captures d'écran par Playwright) restent une option ouverte. Storybook est différé (cf. Considered Options).
