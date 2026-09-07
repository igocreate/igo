import { http, HttpResponse } from 'msw';

import type { Book } from '@/features/books/types';

export const aBook = (overrides: Partial<Book> = {}): Book => ({
  id: 1, title: 'Dune', author: 'Frank Herbert', pages: 412,
  published: true, createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

// Default handlers describe the happy path; a test overrides the one case it
// is about with server.use().
export const handlers = [
  http.get('/api/books', () =>
    HttpResponse.json({
      books: [aBook()],
      page:  { page: 1, perPage: 25, pages: 1, total: 1 },
    })
  ),

  http.post('/api/books', async ({ request }) => {
    const body = (await request.json()) as Partial<Book>;
    return HttpResponse.json(aBook({ id: 2, ...body }), { status: 201 });
  }),
];
