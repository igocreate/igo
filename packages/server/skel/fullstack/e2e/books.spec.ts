import { expect, test } from '@playwright/test';

import { BooksPage } from './pages/books.page';

// E2E covers the wiring end to end — browser, front build, proxy, API, database.
// Everything below that is already covered faster by the front and back tests,
// so this file stays short on purpose.
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

    // the database is shared with the other tests, so the title has to be ours
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
