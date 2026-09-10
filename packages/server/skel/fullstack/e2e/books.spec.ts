import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { BooksPage } from './pages/books.page';

test.describe('books', () => {
  test("liste les livres servis par l'API", async ({ page }) => {
    const books = new BooksPage(page);
    await books.goto();

    await expect(books.heading).toBeVisible();
    await expect(books.loading).toBeHidden();
    await expect(books.total).toBeVisible();
  });

  test("ajoute un livre et l'affiche dans la liste", async ({ page }) => {
    const books = new BooksPage(page);
    await books.goto();

    const title = `Dune ${Date.now()}`;
    await books.addBook({ title, author: 'Frank Herbert', pages: '412' });

    await expect(books.bookNamed(title)).toBeVisible();
  });

  test('affiche les erreurs de validation renvoyées par le serveur', async ({ page }) => {
    const books = new BooksPage(page);
    await books.goto();

    await books.submit.click();

    await expect(books.errors.first()).toBeVisible();
  });
});

// Un écran ajouté au parcours s'ajoute ici.
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
