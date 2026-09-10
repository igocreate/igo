import { dev } from '@igojs/server';
import assert from 'assert';

import Book from '../../../app/features/books/Book';

dev.test();

const agent = dev.agent;

const createBook = (values = {}) =>
  Book.create({
    title: 'Dune',
    author: 'Frank Herbert',
    pages: 412,
    ...values,
  });

describe('api/books', function () {
  describe('GET /api/books', function () {
    it('liste les livres', async () => {
      await createBook();

      const res = await agent.get('/api/books');

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.books.length, 1);
      assert.strictEqual(res.data.books[0].title, 'Dune');
      assert.strictEqual(res.data.page.total, 1);
    });

    it('refuse un paramètre de requête invalide', async () => {
      const res = await agent.get('/api/books?page=0');

      assert.strictEqual(res.statusCode, 400);
      assert.deepStrictEqual(
        res.data.errors.map((e: { path: string }) => e.path),
        ['page'],
      );
    });
  });

  describe('GET /api/books/:id', function () {
    it("n'expose que les champs sérialisés", async () => {
      const book = await createBook();

      const res = await agent.get(`/api/books/${book.id}`);

      assert.strictEqual(res.statusCode, 200);
      assert.deepStrictEqual(Object.keys(res.data).toSorted(), [
        'author',
        'createdAt',
        'id',
        'pages',
        'published',
        'title',
      ]);
    });

    it('répond 404 pour un id inconnu', async () => {
      const res = await agent.get('/api/books/999999');

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.data.status, 404);
    });

    it("refuse un id qui n'est pas un entier positif", async () => {
      const res = await agent.get('/api/books/abc');

      assert.strictEqual(res.statusCode, 400);
      assert.deepStrictEqual(
        res.data.errors.map((e: { path: string }) => e.path),
        ['id'],
      );
    });
  });

  describe('POST /api/books', function () {
    it('crée un livre', async () => {
      const res = await agent.post('/api/books', {
        body: { title: 'Dune', author: 'Frank Herbert', pages: 412 },
      });

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.data.title, 'Dune');
      assert.strictEqual(res.data.published, false);

      const book = await Book.find(res.data.id);
      assert.strictEqual(book?.title, 'Dune');
    });

    it('refuse un corps invalide', async () => {
      const res = await agent.post('/api/books', { body: { title: '', pages: 'many' } });

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.data.title, 'Validation failed');
      assert.deepStrictEqual(res.data.errors.map((e: { path: string }) => e.path).toSorted(), [
        'author',
        'pages',
        'title',
      ]);
    });
  });

  describe('PUT /api/books/:id', function () {
    it('remplace le livre entier', async () => {
      const book = await createBook();

      const res = await agent.put(`/api/books/${book.id}`, {
        body: { title: 'Dune Messiah', author: 'Frank Herbert', pages: 256, published: true },
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.title, 'Dune Messiah');
      assert.strictEqual(res.data.pages, 256);
      assert.strictEqual(res.data.published, true);
    });

    it('refuse un corps partiel', async () => {
      const book = await createBook();

      const res = await agent.put(`/api/books/${book.id}`, { body: { title: 'Dune Messiah' } });

      assert.strictEqual(res.statusCode, 400);
      assert.deepStrictEqual(res.data.errors.map((e: { path: string }) => e.path).toSorted(), [
        'author',
        'pages',
        'published',
      ]);
    });

    it('répond 404 pour un id inconnu', async () => {
      const res = await agent.put('/api/books/999999', {
        body: { title: 'Dune', author: 'Frank Herbert', pages: 412, published: false },
      });

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.data.type, '/problems/book-not-found');
    });
  });

  describe('DELETE /api/books/:id', function () {
    it('supprime le livre', async () => {
      const book = await createBook();

      const res = await agent.delete(`/api/books/${book.id}`);

      assert.strictEqual(res.statusCode, 204);
      assert.strictEqual(await Book.find(book.id), null);
    });
  });
});
