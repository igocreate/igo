import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { BooksPage } from './pages/books.page';

// Un E2E couvre le câblage de bout en bout — navigateur, build du front, proxy,
// API, base. Tout ce qui se couvre plus bas l'est déjà plus vite par les tests
// du front et du back, donc ce fichier reste court à dessein.
test.describe('books', () => {
  test('should list the books served by the API', async ({ page }) => {
    const books = new BooksPage(page);
    await books.goto();

    await expect(books.heading).toBeVisible();
    await expect(books.loading).toBeHidden();
    await expect(books.total).toBeVisible();
  });

  test('should add a book and show it in the list', async ({ page }) => {
    const books = new BooksPage(page);
    await books.goto();

    // La base est partagée avec les autres tests, et ils tournent en parallèle :
    // ce test se donne donc une donnée qui lui appartient. Vaut aussi pour une
    // donnée qu'on modifie — trancher une entrée des seeds fait passer le test
    // une fois, puis échouer.
    const title = `Dune ${Date.now()}`;
    await books.addBook({ title, author: 'Frank Herbert', pages: '412' });

    await expect(books.bookNamed(title)).toBeVisible();
  });

  test('should show the validation errors the server returns', async ({ page }) => {
    const books = new BooksPage(page);
    await books.goto();

    await books.submit.click();

    await expect(books.errors.first()).toBeVisible();
  });
});

// Les ADR exigent qu'un écran ne porte aucune violation WCAG 2.1 AA. axe ne
// juge que ce qu'une machine peut vérifier — la moitié des critères environ —
// mais cette moitié se régresse sans qu'on s'en aperçoive, alors que le reste
// se relit.
//
// Un écran ajouté au parcours s'ajoute ici : le coût est une ligne, l'oubli se
// paie en audit.
test.describe('accessibilité', () => {
  test('les écrans ne portent aucune violation', async ({ page }) => {
    const books = new BooksPage(page);
    await books.goto();
    await expect(books.heading).toBeVisible();

    const resultats = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(resultats.violations).toEqual([]);
  });
});
