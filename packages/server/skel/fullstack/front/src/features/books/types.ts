// Reflète le DTO que le back sérialise, écrit à la main : le front ne dépend
// pas du build du back, et un écart se voit dans les tests de feature.
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
