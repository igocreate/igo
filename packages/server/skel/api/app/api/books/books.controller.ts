import { sendProblem } from '@igojs/server';
import type { ApiHandler } from '@igojs/server';

import Book from '../../models/Book';
import * as dto from './books.dto';

// The schemas below give req.body and req.query their types: no shape is
// declared twice, and a field that is not in the schema is a compile error.
export const index: ApiHandler<{ query: typeof dto.ListBooks }> = async (req, res) => {
  const { page, limit, published } = req.query;

  let query = Book.order('created_at desc');
  if (published !== undefined) {
    query = query.where({ published });
  }

  const { rows, pagination } = await query.page(page, limit).list();
  res.json({
    books: rows.map(dto.serialize),
    page: dto.serializePage(pagination),
  });
};
index.query = dto.ListBooks;

//
export const show: ApiHandler = async (req, res) => {
  const book = await Book.find(req.params.id);
  if (!book) {
    return void sendProblem(res, 404, { detail: 'Book not found' });
  }
  res.json(dto.serialize(book));
};

//
export const create: ApiHandler<{ body: typeof dto.CreateBook }> = async (req, res) => {
  const book = await Book.create(req.body);
  res.status(201).json(dto.serialize(book));
};
create.body = dto.CreateBook;

//
export const update: ApiHandler<{ body: typeof dto.UpdateBook }> = async (req, res) => {
  const book = await Book.find(req.params.id);
  if (!book) {
    return void sendProblem(res, 404, { detail: 'Book not found' });
  }
  await book.update(req.body);
  res.json(dto.serialize(book));
};
update.body = dto.UpdateBook;

//
export const destroy: ApiHandler = async (req, res) => {
  const book = await Book.find(req.params.id);
  if (!book) {
    return void sendProblem(res, 404, { detail: 'Book not found' });
  }
  await book.delete();
  res.status(204).end();
};
