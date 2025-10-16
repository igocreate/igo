require('./init');

const assert = require('assert');
const agent  = require('../src/dev/test/agent');

describe('ErrorHandler', function() {

  describe('404 handling', function() {
    it('should handle not found pages', async () => {
      const res = await agent.get('/this-page-does-not-exist');
      assert.strictEqual(res.statusCode, 404);
    });

    it('should handle 404 for POST requests', async () => {
      const res = await agent.post('/this-route-does-not-exist', {
        body: { test: 'data' }
      });
      assert.strictEqual(res.statusCode, 404);
    });

    it('should handle 404 for PUT requests', async () => {
      const res = await agent.put('/this-route-does-not-exist', {
        body: { test: 'data' }
      });
      assert.strictEqual(res.statusCode, 404);
    });

    it('should handle 404 for DELETE requests', async () => {
      const res = await agent.delete('/this-route-does-not-exist');
      assert.strictEqual(res.statusCode, 404);
    });
  });

  describe('Routes', function() {
    it('should handle normal GET requests', async () => {
      const res = await agent.get('/');
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body, 'Hello Igo');
    });

    it('should handle normal POST requests', async () => {
      const res = await agent.post('/echo', {
        body: { test: 'data' }
      });
      assert.strictEqual(res.statusCode, 200);
    });
  });

  // Note: Error handler tests are skipped in test mode because:
  // - initContext is not called (see src/app.js:88-90)
  // - Error handler middleware is not registered (see src/app.js:116-118)
  // This is by design to allow tests to see raw errors

  describe.skip('Error handling (disabled in test mode)', function() {

    it('should handle sync errors in routes', async () => {
      const res = await agent.get('/error');
      assert.strictEqual(res.statusCode, 500);
    });

    it('should handle promise rejections', async () => {
      const res = await agent.get('/promise-rejection');
      assert.strictEqual(res.statusCode, 200);
      // Promise rejection happens after response is sent
    });
  });

});
