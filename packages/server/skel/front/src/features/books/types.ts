// Mirrors the DTO the back serializes. Kept by hand: the back is JavaScript,
// so there is no contract to generate from — a mismatch shows up in the
// feature tests, which run against the real payload shape.
export interface Book {
  id: number;
  title: string;
  author: string;
  pages: number;
  published: boolean;
  createdAt: string;
}

export interface BooksPage {
  books: Book[];
  page: { page: number; perPage: number; pages: number; total: number };
}

export interface CreateBook {
  title: string;
  author: string;
  pages: number;
  published?: boolean;
}
