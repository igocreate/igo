// Reflète le DTO que le back sérialise. Écrit à la main : le back est en
// JavaScript, il n'y a donc aucun contrat à partir duquel générer — un écart se
// voit dans les tests de feature, qui tournent contre la forme réelle de la
// charge.
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
