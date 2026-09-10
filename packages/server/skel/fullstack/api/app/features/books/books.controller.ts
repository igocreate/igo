import { sendProblem } from '@igojs/server';
import type { ApiHandler } from '@igojs/server';

import Book from './Book';
import * as dto from './books.dto';

// Le `type` est ce sur quoi un client branche — le statut seul ne distingue pas
// deux situations métier. C'est une URI, et le slug appartient au projet.
const BOOK_NOT_FOUND = '/problems/book-not-found';

// Les schémas ci-dessous donnent leurs types à req.body et req.query : aucune
// forme n'est déclarée deux fois, et un champ absent du schéma est une erreur de
// compilation.
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

export const show: ApiHandler = async (req, res) => {
  const book = await Book.find(req.params.id);
  if (!book) {
    return void sendProblem(res, 404, { type: BOOK_NOT_FOUND, detail: 'Book not found' });
  }
  res.json(dto.serialize(book));
};

export const create: ApiHandler<{ body: typeof dto.CreateBook }> = async (req, res) => {
  const book = await Book.create(req.body);
  res.status(201).json(dto.serialize(book));
};
create.body = dto.CreateBook;

export const update: ApiHandler<{ body: typeof dto.UpdateBook }> = async (req, res) => {
  const book = await Book.find(req.params.id);
  if (!book) {
    return void sendProblem(res, 404, { type: BOOK_NOT_FOUND, detail: 'Book not found' });
  }
  await book.update(req.body);
  res.json(dto.serialize(book));
};
update.body = dto.UpdateBook;

export const destroy: ApiHandler = async (req, res) => {
  const book = await Book.find(req.params.id);
  if (!book) {
    return void sendProblem(res, 404, { type: BOOK_NOT_FOUND, detail: 'Book not found' });
  }
  await book.delete();
  res.status(204).end();
};
