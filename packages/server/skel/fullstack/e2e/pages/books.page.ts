import type { Locator, Page } from '@playwright/test';

// A page object exposes locators and the actions that reach them. It holds no
// assertion: what counts as correct belongs to the test, so the same locator
// can be expected present in one test and absent in another.
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
    this.heading = page.getByRole('heading', { name: 'Books' });
    this.loading = page.getByText(/loading/i);
    this.total = page.getByText(/in total/);
    this.title = page.getByLabel('title');
    this.author = page.getByLabel('author');
    this.pages = page.getByLabel('pages');
    this.submit = page.getByRole('button', { name: /add book/i });
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
