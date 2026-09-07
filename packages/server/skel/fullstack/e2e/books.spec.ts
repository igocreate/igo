import { expect, test } from '@playwright/test';

// E2E covers the wiring end to end — browser, front build, proxy, API, database.
// Everything below that is already covered faster by the front and back tests,
// so this file stays short on purpose.
test.describe('books', () => {

  test('should list the books served by the API', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Books' })).toBeVisible();
    await expect(page.getByText(/loading/i)).toBeHidden();
  });

  test('should add a book and show it in the list', async ({ page }) => {
    await page.goto('/');

    const title = `Dune ${Date.now()}`;
    await page.getByLabel('title').fill(title);
    await page.getByLabel('author').fill('Frank Herbert');
    await page.getByLabel('pages').fill('412');
    await page.getByRole('button', { name: /add book/i }).click();

    await expect(page.getByText(title)).toBeVisible();
  });

  test('should show the validation errors the server returns', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /add book/i }).click();

    await expect(page.getByRole('alert').first()).toBeVisible();
  });
});
