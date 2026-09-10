import type { Express } from 'express';

import books from './features/books/books.routes';

export const init = (app: Express) => {
  app.api('/books', books);

  app.get('/', (req, res) => {
    res.json({ name: '{project.name}', status: 'running' });
  });
};
