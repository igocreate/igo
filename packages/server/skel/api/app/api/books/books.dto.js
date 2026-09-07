
const { z } = require('zod');

// Incoming: what the API accepts. Coercion and defaults are applied before the
// controller runs, so req.body and req.query already hold the right types.
exports.CreateBook = z.object({
  title:      z.string().min(1).max(255),
  author:     z.string().min(1).max(255),
  pages:      z.number().int().positive(),
  published:  z.boolean().default(false),
});

exports.UpdateBook = exports.CreateBook.partial();

exports.ListBooks = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(25),
  // z.coerce.boolean() would turn 'false' into true: URL flags need this form
  published: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
});

// Outgoing: the barrier between the ORM model and the API. Adding a column to
// the model exposes nothing until it is named here.
exports.serialize = (book) => ({
  id:        book.id,
  title:     book.title,
  author:    book.author,
  pages:     book.pages,
  published: book.published,
  createdAt: book.created_at,
});

// The ORM pagination also carries `links`, meant for rendering page numbers in
// a template: an API client builds its own navigation.
exports.serializePage = (pagination) => ({
  page:    pagination.page,
  perPage: pagination.nb,
  pages:   pagination.nb_pages,
  total:   pagination.count,
});
