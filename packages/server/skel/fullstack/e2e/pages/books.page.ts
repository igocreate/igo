import type { Locator, Page } from '@playwright/test';

// Un page object expose des locators et les actions qui y mènent. Il ne porte
// aucune assertion : ce qui est correct appartient au test, si bien qu'un même
// locator peut être attendu présent dans un test et absent dans un autre.
export class BooksPage {
  readonly heading: Locator;
  readonly loading: Locator;
  readonly total: Locator;
  readonly title: Locator;
  readonly author: Locator;
  readonly pages: Locator;
  readonly submit: Locator;
  readonly errors: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Livres' });
    this.loading = page.getByText(/chargement/i);
    this.total = page.getByText(/au total/);
    this.title = page.getByLabel('Titre');
    this.author = page.getByLabel('Auteur');
    this.pages = page.getByLabel('Pages');
    this.submit = page.getByRole('button', { name: /ajouter/i });
    this.errors = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/');
  }

  bookNamed(title: string): Locator {
    return this.page.getByText(title);
  }

  async addBook({ title, author, pages }: { title: string; author: string; pages: string }) {
    await this.title.fill(title);
    await this.author.fill(author);
    await this.pages.fill(pages);
    await this.submit.click();
  }
}
