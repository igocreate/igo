// Déclarer les routes ici
// Documentation : http://expressjs.com/en/guide/routing.html

import type { Express } from 'express';

import books from './features/books/books.routes';

//
export const init = (app: Express) => {
  // monté sous config.api.prefix -> /api/books
  app.api('/books', books);

  app.get('/', (req, res) => {
    res.json({ name: '{project.name}', status: 'running' });
  });
};
