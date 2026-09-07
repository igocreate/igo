import { dev } from '@igojs/server';
import assert from 'assert';

import Book from '../../app/models/Book';

dev.test();

const agent = dev.agent;

const createBook = (values = {}) => Book.create({
  title: 'Dune', author: 'Frank Herbert', pages: 412, ...values
});

describe('api/books', function() {

  describe('GET /api/books', function() {

    it('should list the books', async () => {
      await createBook();

      const res = await agent.get('/api/books');

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.books.length, 1);
      assert.strictEqual(res.data.books[0].title, 'Dune');
      assert.strictEqual(res.data.page.total, 1);
    });

    it('should reject an invalid query param', async () => {
      const res = await agent.get('/api/books?page=0');

      assert.strictEqual(res.statusCode, 400);
      assert.deepStrictEqual(res.data.errors.map((e: { path: string }) => e.path), ['page']);
    });
  });

  describe('GET /api/books/:id', function() {

    it('should expose only the serialized fields', async () => {
      const book = await createBook();

      const res = await agent.get(`/api/books/${book.id}`);

      assert.strictEqual(res.statusCode, 200);
      assert.deepStrictEqual(Object.keys(res.data).sort(),
        ['author', 'createdAt', 'id', 'pages', 'published', 'title']);
    });

    it('should answer 404 for an unknown id', async () => {
      const res = await agent.get('/api/books/999999');

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.data.status, 404);
    });
  });

  describe('POST /api/books', function() {

    it('should create a book', async () => {
      const res = await agent.post('/api/books', {
        body: { title: 'Dune', author: 'Frank Herbert', pages: 412 }
      });

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.data.title, 'Dune');
      assert.strictEqual(res.data.published, false);

      const book = await Book.find(res.data.id);
      assert.strictEqual(book.title, 'Dune');
    });

    it('should reject an invalid body', async () => {
      const res = await agent.post('/api/books', { body: { title: '', pages: 'many' } });

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.data.title, 'Validation failed');
      assert.deepStrictEqual(
        res.data.errors.map((e: { path: string }) => e.path).sort(),
        ['author', 'pages', 'title']
      );
    });
  });

  describe('DELETE /api/books/:id', function() {

    it('should delete the book', async () => {
      const book = await createBook();

      const res = await agent.delete(`/api/books/${book.id}`);

      assert.strictEqual(res.statusCode, 204);
      assert.strictEqual(await Book.find(book.id), null);
    });
  });
});
