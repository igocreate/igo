require('./init');

const assert = require('assert');
const fs     = require('fs');
const agent  = require('@igojs/server').dev.agent;
const errorhandler = require('@igojs/server/src/connect/errorhandler');
const logger = require('@igojs/server/src/logger');
const { _test: throttle } = errorhandler;

const fakeReq = () => ({
  method: 'POST', originalUrl: '/x', url: '/x', protocol: 'http',
  headers: { host: 'localhost' }, get: () => '', body: {}, session: {},
});

const fakeRes = () => {
  const res = { headersSent: false, statusCode: 200 };
  res.status = (code) => { res.statusCode = code; return res; };
  res.render = () => res;
  res.send   = () => res;
  return res;
};

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

  describe('SyntaxError classification', function() {
    const runWithSpiedLogger = (err) => {
      const orig = logger.error;
      let logged = false;
      logger.error = () => { logged = true; };
      const res = fakeRes();
      try {
        errorhandler.error(err, fakeReq(), res, () => {});
      } finally {
        logger.error = orig;
      }
      return { res, logged };
    };

    it('treats malformed JSON body as a client error (not logged)', () => {
      const err = new SyntaxError('Unexpected token');
      err.type = 'entity.parse.failed';
      const { logged } = runWithSpiedLogger(err);
      assert.strictEqual(logged, false);
    });

    it('treats a bare SyntaxError (compile bug) as a server error (logged)', () => {
      const { logged } = runWithSpiedLogger(new SyntaxError('Invalid left-hand side in assignment'));
      assert.strictEqual(logged, true);
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

  describe('Crash email content', function() {

    it('should escape HTML', () => {
      assert.strictEqual(
        throttle.escapeHtml('<script>alert("x")</script>'),
        '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
      );
    });

    it('should redact sensitive keys recursively', () => {
      const redacted = throttle.redact({
        user: { password: 'hunter2', name: 'bob' },
        headers: { cookie: 'app=xxx', authorization: 'Bearer xxx', host: 'localhost' },
        api_token: 'xxx',
      });
      assert.deepStrictEqual(redacted, {
        user: { password: '[redacted]', name: 'bob' },
        headers: { cookie: '[redacted]', authorization: '[redacted]', host: 'localhost' },
        api_token: '[redacted]',
      });
    });

    it('should keep non-objects and arrays intact', () => {
      assert.strictEqual(throttle.redact(null), null);
      assert.strictEqual(throttle.redact('text'), 'text');
      assert.deepStrictEqual(throttle.redact([{ token: 'x' }, 1]), [{ token: '[redacted]' }, 1]);
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
