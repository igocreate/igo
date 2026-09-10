require('./init');

const assert = require('assert');
const { config } = require('@igojs/server');
const agent    = require('@igojs/server').dev.agent;
const security = require('@igojs/server/src/connect/security');

const withSecurity = async (overrides, fn) => {
  const saved = config.security;
  config.security = overrides === false ? false : { ...saved, ...overrides };
  try {
    await fn();
  } finally {
    config.security = saved;
  }
};

describe('security headers', function() {

  it('should send the page headers a pentest asks for', async () => {
    const res = await agent.get('/');
    assert.strictEqual(res.headers['X-Content-Type-Options'], 'nosniff');
    assert.strictEqual(res.headers['X-Frame-Options'],        'SAMEORIGIN');
    assert.strictEqual(res.headers['Referrer-Policy'],        'strict-origin-when-cross-origin');
    assert.strictEqual(res.headers['Permissions-Policy'],     'camera=(), microphone=(), geolocation=()');
  });

  // a working CSP is made of a project's own exceptions: none is invented here
  it('should send no page CSP unless the project declares one', async () => {
    assert.strictEqual((await agent.get('/')).headers['Content-Security-Policy'], undefined);
    await withSecurity({ csp: 'default-src \'self\'' }, async () => {
      assert.strictEqual((await agent.get('/')).headers['Content-Security-Policy'], 'default-src \'self\'');
    });
  });

  it('should lock down API responses, which never execute and may carry personal data', async () => {
    const res = await agent.get('/api/books');
    assert.strictEqual(res.headers['Content-Security-Policy'], 'default-src \'none\'; frame-ancestors \'none\'');
    assert.strictEqual(res.headers['Cache-Control'],           'no-store');
    assert.strictEqual(res.headers['X-Content-Type-Options'],  'nosniff');
  });

  it('should drop a header set to false, and all of them when security is false', async () => {
    await withSecurity({ frameOptions: false }, async () => {
      const res = await agent.get('/');
      assert.strictEqual(res.headers['X-Frame-Options'], undefined);
      assert.strictEqual(res.headers['X-Content-Type-Options'], 'nosniff');
    });
    await withSecurity(false, async () => {
      assert.strictEqual((await agent.get('/')).headers['X-Content-Type-Options'], undefined);
    });
  });

  describe('HSTS', function() {
    const run = (env, secure) => {
      const sent = {};
      const saved = config.env;
      config.env = env;
      try {
        security({ path: '/', headers: {}, secure }, { setHeader: (k, v) => { sent[k] = v; } }, () => {});
      } finally {
        config.env = saved;
      }
      return sent['Strict-Transport-Security'];
    };

    it('should be sent in production over HTTPS', () => {
      assert.strictEqual(run('production', true), 'max-age=63072000; includeSubDomains');
    });

    // a browser ignores it over HTTP, and an intranet in plain HTTP must not be told otherwise
    it('should not be sent over HTTP, nor outside production', () => {
      assert.strictEqual(run('production', false), undefined);
      assert.strictEqual(run('dev', true), undefined);
    });
  });
});
