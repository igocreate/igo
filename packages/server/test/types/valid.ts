import { z } from 'zod';
import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { Model } from '@igojs/db';
import type { ApiHandler } from '../../index';

interface BookRow { id: number; title: string; pages: number }
class Book extends Model<BookRow>({ table: 'books', columns: ['id', 'title', 'pages'] }) {}

export const found = async (): Promise<string | undefined> => {
  const book = await Book.find(1);
  const { rows } = await Book.where({ pages: 412 }).page(1, 25).list();
  return book?.title ?? rows[0]?.title;
};

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

// A guard in front of a handler whose params are typed by a schema has to be
// generic on the params: a RequestHandler would pin them to ParamsDictionary.
const BookId = z.object({ id: z.coerce.number().int().positive() });
export const destroy: ApiHandler<{ params: typeof BookId }> = (req, res) => {
  const id: number = req.params.id;
  res.status(204).json({ id });
};
destroy.params = BookId;

const guardParams = <P>(_req: Request<P>, _res: Response, next: NextFunction) => next();

const router = Router();
router.get('/books', index);
router.delete('/books/:id', guardParams, destroy);
router.get('/books/guarded', guard, index);
router.get('/books/twice', guard, guard, index);
router.post('/books', guard, create);
