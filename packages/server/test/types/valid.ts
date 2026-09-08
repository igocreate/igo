import { z } from 'zod';
import type { ApiHandler } from '../../index';

const CreateBook = z.object({
  title: z.string().min(1),
  pages: z.number().int().positive(),
});

const ListBooks = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  status: z.enum(['draft', 'published']).optional(),
});

export const create: ApiHandler<{ body: typeof CreateBook }> = (req, res) => {
  const title: string = req.body.title;
  const pages: number = req.body.pages;
  res.status(201).json({ title, pages });
};
create.body = CreateBook;

export const index: ApiHandler<{ query: typeof ListBooks }> = (req, res) => {
  const page: number = req.query.page;
  const status: 'draft' | 'published' | undefined = req.query.status;
  res.json({ page, status });
};
index.query = ListBooks;
