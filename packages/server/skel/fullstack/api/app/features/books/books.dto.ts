import { z } from 'zod';
import type { BookRow } from './Book';

// Entrant : ce que l'API accepte. Coercition et valeurs par défaut sont
// appliquées avant le contrôleur, donc req.body et req.query portent déjà les
// bons types.
export const CreateBook = z.object({
  title: z.string().min(1).max(255),
  author: z.string().min(1).max(255),
  pages: z.number().int().positive(),
  published: z.boolean().default(false),
});

export const UpdateBook = CreateBook.partial();

export const ListBooks = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  // z.coerce.boolean() transformerait 'false' en true : un drapeau d'URL exige
  // cette forme
  published: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

// Sortant : la barrière entre le modèle de l'ORM et l'API. Ajouter une colonne
// au modèle n'expose rien tant qu'elle n'est pas nommée ici.
export const serialize = (book: BookRow) => ({
  id: book.id,
  title: book.title,
  author: book.author,
  pages: book.pages,
  published: book.published,
  createdAt: book.created_at,
});

// La pagination de l'ORM porte aussi `links`, prévu pour afficher des numéros
// de page dans un gabarit : un client d'API construit sa propre navigation.
export const serializePage = (pagination: {
  page: number;
  nb: number;
  nb_pages: number;
  count: number;
}) => ({
  page: pagination.page,
  perPage: pagination.nb,
  pages: pagination.nb_pages,
  total: pagination.count,
});
