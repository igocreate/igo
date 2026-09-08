import { z } from 'zod';
import type { BookRow } from './Book';

// Incoming: what the API accepts. Coercion and defaults are applied before the
// controller runs, so req.body and req.query already hold the right types.
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
  // z.coerce.boolean() would turn 'false' into true: URL flags need this form
  published: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

// Outgoing: the barrier between the ORM model and the API. Adding a column to
// the model exposes nothing until it is named here.
export const serialize = (book: BookRow) => ({
  id: book.id,
  title: book.title,
  author: book.author,
  pages: book.pages,
  published: book.published,
  createdAt: book.created_at,
});

// The ORM pagination also carries `links`, meant for rendering page numbers in
// a template: an API client builds its own navigation.
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
