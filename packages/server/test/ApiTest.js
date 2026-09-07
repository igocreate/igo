require('./init');

const assert = require('assert');
const agent  = require('@igojs/server').dev.agent;

describe('API', function() {

  describe('validation', function() {

    it('should pass a valid body through', async () => {
      const res = await agent.post('/api/books', { body: { title: 'Dune', pages: 412 } });
      assert.strictEqual(res.statusCode, 201);
      assert.deepStrictEqual(res.data, { id: 1, title: 'Dune', pages: 412 });
    });

    it('should reject an invalid body with a problem document', async () => {
      const res = await agent.post('/api/books', { body: { title: 'Dune', pages: 'many' } });
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.data.status, 400);
      assert.strictEqual(res.data.title, 'Validation failed');
      assert.deepStrictEqual(res.data.errors.map(e => e.path), ['pages']);
    });

    it('should report every invalid field', async () => {
      const res = await agent.post('/api/books', { body: {} });
      assert.strictEqual(res.statusCode, 400);
      assert.deepStrictEqual(res.data.errors.map(e => e.path).sort(), ['pages', 'title']);
    });

    it('should coerce query params to their schema type', async () => {
      const res = await agent.get('/api/books?page=3');
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.page, 3);
      assert.strictEqual(res.data.typeofPage, 'number');
    });

    it('should apply query defaults when the param is absent', async () => {
      const res = await agent.get('/api/books');
      assert.strictEqual(res.data.page, 1);
    });

    it('should reject an invalid query param', async () => {
      const res = await agent.get('/api/books?status=burned');
      assert.strictEqual(res.statusCode, 400);
      assert.deepStrictEqual(res.data.errors.map(e => e.path), ['status']);
    });

    it('should leave a route without schema untouched', async () => {
      const res = await agent.post('/api/books/bulk', { body: { anything: true } });
      assert.strictEqual(res.statusCode, 200);
      assert.deepStrictEqual(res.data, { ok: true });
    });
  });

  describe('errors', function() {

    it('should answer 404 in JSON under the api prefix', async () => {
      const res = await agent.get('/api/nope');
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.data.status, 404);
      assert.strictEqual(res.data.title, 'Not Found');
    });

    it('should still render HTML for a non-api 404', async () => {
      const res = await agent.get('/nope');
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.data, undefined);
    });

    it('should answer JSON when the client asks for it', async () => {
      const res = await agent.get('/nope', { headers: { accept: 'application/json' } });
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.data.status, 404);
    });
  });

  describe('routing', function() {

    it('should mount the router under the api prefix', async () => {
      const res = await agent.get('/api/books/7');
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.id, 7);
    });
  });
});
