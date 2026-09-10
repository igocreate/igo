# {project.name} — e2e

Parcours Playwright contre le build, API et base réelles.

## Commandes

```bash
pnpm test:e2e                                      # depuis la racine
pnpm --filter ./e2e exec playwright test --ui      # mode interactif
pnpm --filter ./e2e exec playwright test --debug   # pas à pas
```

`playwright.config.ts` démarre l'API et le front lui-même, et les arrête après.
Rien à lancer à la main. En CI c'est le build qui est testé — ce qui est
déployé ; en local, `tsx watch` évite de rebuilder à chaque exécution.

## Ce qui a sa place ici

Un E2E vérifie le **câblage** : navigateur, build du front, proxy, API, base.
Il est lent et il casse pour des raisons qui n'ont rien à voir avec ce qu'il
teste, donc il reste rare.

Tout ce qui peut être couvert plus bas doit l'être plus bas :

| Question | Où |
|---|---|
| ce contrôleur renvoie-t-il le bon JSON ? | `api/test/` |
| ce composant affiche-t-il l'erreur ? | `front/src/**/*.test.tsx` |
| l'ensemble tient-il debout ? | ici |

Un chemin critique — le parcours qui fait perdre de l'argent s'il casse —
mérite un E2E. Une variante d'affichage, non.

## Page Objects

**Un POM expose des locators et les actions qui y mènent. Il ne porte aucune
assertion** : ce qui est correct appartient au test, et le même locator est
attendu présent dans un test, absent dans un autre.

```ts
// pages/books.page.ts
export class BooksPage {
  readonly heading: Locator;
  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Livres' });
  }
  async goto() { await this.page.goto('/'); }
}

// books.spec.ts
await expect(books.heading).toBeVisible();
```

Un POM par page ou par écran, dans `pages/`.

## Sélecteurs

Dans l'ordre de préférence : `getByRole`, `getByLabel`, `getByText`. Ce sont
ceux qu'un utilisateur — et un lecteur d'écran — perçoit ; ils cassent quand le
comportement change, pas quand une classe CSS bouge.

`data-testid` en dernier recours, quand rien d'accessible n'identifie l'élément.
Jamais de sélecteur CSS ou XPath structurel.

## Attentes

Pas de `waitForTimeout`. Les assertions `expect(locator)` réessaient toutes
seules : `await expect(x).toBeVisible()` attend déjà.

## Accessibilité

Un écran ne doit porter aucune violation WCAG 2.1 AA, vérifié par
`@axe-core/playwright`. Un écran ajouté au parcours s'ajoute au test : axe ne
juge que ce qui est vérifiable par une machine, mais cette moitié des critères
se régresse en silence.

## Données

La base est partagée entre les tests, et ils tournent en parallèle. **Un test
utilise un jeu de données qui lui appartient** — qu'il le crée ou qu'il le
modifie.

À la création, un nom qui n'appartient qu'à lui (`Dune ${Date.now()}`) plutôt
qu'un état de départ supposé. À la modification, une donnée qu'il a créée
lui-même : trancher une entrée des seeds fait passer le test la première fois,
puis échouer — un test vert qui devient rouge sans qu'aucun code n'ait changé,
et qui reverdit après un reseed. On cherche alors la régression dans le code.

Un projet qui a besoin d'un jeu de données dédié le pose lui-même — il n'y a
pas de seed E2E ici.
