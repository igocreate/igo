import { z } from 'zod';
import { Router, type RequestHandler } from 'express';
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
  const traceId: string = req.traceId;
  res.status(201).json({ title, pages, traceId });
};
create.body = CreateBook;

export const index: ApiHandler<{ query: typeof ListBooks }> = (req, res) => {
  const page: number = req.query.page;
  const status: 'draft' | 'published' | undefined = req.query.status;
  res.json({ page, status });
};
index.query = ListBooks;

// A guard in front of a paginated handler: Express takes the handlers of one
// route in a rest parameter, so the middleware used to pin the query type to
// ParsedQs and no overload matched. The ADR asks every API controller to cover
// its refused-access case, so this is the ordinary shape, not an edge case.
const guard: RequestHandler = (_req, _res, next) => next();

const router = Router();
router.get('/books', index);
router.get('/books/guarded', guard, index);
router.get('/books/twice', guard, guard, index);
router.post('/books', guard, create);
