import Book from '../app/features/books/Book';

// Seeds give a fresh checkout something to look at. Data the application needs
// to run belongs in a migration — this runs only outside production, and only
// when someone asks for it.
export default async () => {
  await Book.create({ title: 'Dune', author: 'Frank Herbert', pages: 412 });
  await Book.create({ title: 'Neuromancer', author: 'William Gibson', pages: 271 });
};
