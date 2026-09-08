require('../init');

const assert = require('assert');
const agent  = require('@igojs/server').dev.agent;

const requestlogger = require('@igojs/server/src/connect/requestlogger');

describe('connect/requestlogger', function() {

  it('should expose a request id to the handler and the client', async () => {
    const res = await agent.get('/');
    assert.match(res.headers['X-Request-Id'], /^[0-9a-f-]{36}$/);
  });

  it('should give each request its own id', async () => {
    const first  = await agent.get('/');
    const second = await agent.get('/');
    assert.notStrictEqual(first.headers['X-Request-Id'], second.headers['X-Request-Id']);
  });

  it('should reuse an id issued upstream, so one request can be followed across services', async () => {
    const res = await agent.get('/', { headers: { 'x-request-id': 'from-the-proxy' } });
    assert.strictEqual(res.headers['X-Request-Id'], 'from-the-proxy');
  });

  it('should ignore an absurdly long inbound id', async () => {
    const res = await agent.get('/', { headers: { 'x-request-id': 'x'.repeat(300) } });
    assert.match(res.headers['X-Request-Id'], /^[0-9a-f-]{36}$/);
  });

  it('should not leak a request id outside of a request', () => {
    assert.strictEqual(requestlogger.requestId(), undefined);
  });
});
