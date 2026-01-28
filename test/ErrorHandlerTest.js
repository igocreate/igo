require('./init');

const assert = require('assert');
const fs     = require('fs');
const agent  = require('../src/dev/test/agent');
const { _test: throttle } = require('../src/connect/errorhandler');

describe('ErrorHandler', function() {

  describe('404 handling', function() {
    it('should handle not found pages', async () => {
      const res = await agent.get('/this-page-does-not-exist');
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

  describe('Email throttling', function() {

    beforeEach(function() {
      // Clean throttle file before each test
      if (fs.existsSync(throttle.THROTTLE_FILE)) {
        fs.unlinkSync(throttle.THROTTLE_FILE);
      }
    });

    it('should allow first emails', function() {
      const result = throttle.checkThrottle('TestError');
      assert.strictEqual(result.throttled, false);
      assert.strictEqual(result.shouldAlert, false);
    });

    it('should allow emails up to limit', function() {
      // First 2 emails should pass without alert
      for (let i = 0; i < throttle.THROTTLE_LIMIT - 1; i++) {
        const result = throttle.checkThrottle('TestError');
        assert.strictEqual(result.throttled, false);
        assert.strictEqual(result.shouldAlert, false);
      }
    });

    it('should alert on reaching limit', function() {
      // Send THROTTLE_LIMIT - 1 emails
      for (let i = 0; i < throttle.THROTTLE_LIMIT - 1; i++) {
        throttle.checkThrottle('TestError');
      }

      // The Nth email should trigger alert
      const result = throttle.checkThrottle('TestError');
      assert.strictEqual(result.throttled, false);
      assert.strictEqual(result.shouldAlert, true);
    });

    it('should block after reaching limit', function() {
      // Send THROTTLE_LIMIT emails (last one triggers block)
      for (let i = 0; i < throttle.THROTTLE_LIMIT; i++) {
        throttle.checkThrottle('TestError');
      }

      // Next email should be blocked
      const result = throttle.checkThrottle('TestError');
      assert.strictEqual(result.throttled, true);
      assert.strictEqual(result.shouldAlert, false);
    });

    it('should allow different errors independently', function() {
      // Block first error
      for (let i = 0; i < throttle.THROTTLE_LIMIT; i++) {
        throttle.checkThrottle('Error1');
      }

      // First error should be blocked
      const result1 = throttle.checkThrottle('Error1');
      assert.strictEqual(result1.throttled, true);

      // Different error should pass
      const result2 = throttle.checkThrottle('Error2');
      assert.strictEqual(result2.throttled, false);
      assert.strictEqual(result2.shouldAlert, false);
    });

    it('should persist throttle data to file', function() {
      throttle.checkThrottle('TestError');

      // Read file directly
      const data = JSON.parse(fs.readFileSync(throttle.THROTTLE_FILE, 'utf8'));
      assert.strictEqual(data.emails.length, 1);
      assert.strictEqual(data.emails[0].error, 'TestError');
    });

    it('should persist block state to file', function() {
      // Trigger block
      for (let i = 0; i < throttle.THROTTLE_LIMIT; i++) {
        throttle.checkThrottle('TestError');
      }

      // Read file directly
      const data = JSON.parse(fs.readFileSync(throttle.THROTTLE_FILE, 'utf8'));
      assert.ok(data.blocked['TestError']);
      assert.ok(data.blocked['TestError'] > Date.now());
    });

  });

});
