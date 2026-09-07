
const { sendProblem } = require('@igojs/server');

const Book = require('../../models/Book');
const dto  = require('./books.dto');

//
exports.index = async (req, res) => {
  const { page, limit, published } = req.query;

  let query = Book.order('created_at desc');
  if (published !== undefined) {
    query = query.where({ published });
  }

  const { rows, pagination } = await query.page(page, limit).list();
  res.json({
    books: rows.map(dto.serialize),
    page:  dto.serializePage(pagination),
  });
};
exports.index.query = dto.ListBooks;

//
exports.show = async (req, res) => {
  const book = await Book.find(req.params.id);
  if (!book) {
    return sendProblem(res, 404, { detail: 'Book not found' });
  }
  res.json(dto.serialize(book));
};

//
exports.create = async (req, res) => {
  const book = await Book.create(req.body);
  res.status(201).json(dto.serialize(book));
};
exports.create.body = dto.CreateBook;

//
exports.update = async (req, res) => {
  const book = await Book.find(req.params.id);
  if (!book) {
    return sendProblem(res, 404, { detail: 'Book not found' });
  }
  await book.update(req.body);
  res.json(dto.serialize(book));
};
exports.update.body = dto.UpdateBook;

//
exports.destroy = async (req, res) => {
  const book = await Book.find(req.params.id);
  if (!book) {
    return sendProblem(res, 404, { detail: 'Book not found' });
  }
  await book.delete();
  res.status(204).end();
};
