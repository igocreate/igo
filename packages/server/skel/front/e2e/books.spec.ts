import { expect, test } from '@playwright/test';

// E2E covers the wiring end to end — browser, build, proxy, API. Everything
// below that is already covered faster by the component and feature tests, so
// this file stays short on purpose.
//
// The API must be running (see README). Seeding and authentication are the
// project's own concern: no skeleton can guess them.
test.describe('books', () => {
  test('should list the books served by the API', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Books' })).toBeVisible();
    await expect(page.getByText(/loading/i)).toBeHidden();
  });

  test('should show the validation errors the server returns', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /add book/i }).click();

    await expect(page.getByRole('alert').first()).toBeVisible();
  });
});
