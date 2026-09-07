
const { z } = require('zod');

exports.CreateBook = z.object({
  title:  z.string().min(1),
  pages:  z.number().int().positive(),
});

exports.ListBooks = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  status: z.enum(['draft', 'published']).optional(),
});

exports.serialize = (book) => ({
  id:    book.id,
  title: book.title,
  pages: book.pages,
});
