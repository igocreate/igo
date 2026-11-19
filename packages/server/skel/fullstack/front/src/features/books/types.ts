import { z } from 'zod';

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

const PAGES_ERROR = 'Le nombre de pages est un entier positif';

// Mêmes règles de surface que le DTO de création de l'API, qui les revérifie :
// le formulaire refuse une saisie mal formée sans aller-retour réseau.
export const NewBook = z.object({
  title: z.string().min(1, 'Le titre est obligatoire').max(255, 'Le titre dépasse 255 caractères'),
  author: z.string().min(1, "L'auteur est obligatoire").max(255, "L'auteur dépasse 255 caractères"),
  pages: z.coerce.number({ error: PAGES_ERROR }).int(PAGES_ERROR).positive(PAGES_ERROR),
});
