// Define your routes here
// Check http://expressjs.com/en/guide/routing.html for documentation

import type { Express } from 'express';

import books from './features/books/books.routes';

//
export const init = (app: Express) => {
  // mounted under config.api.prefix -> /api/books
  app.api('/books', books);

  app.get('/', (req, res) => {
    res.json({ name: '{project.name}', status: 'running' });
  });
};
