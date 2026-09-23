require('./init');

const assert = require('assert');
const path   = require('path');
const { execFileSync } = require('child_process');

const cache  = require('../src/cache');
const config = require('../src/config');
const db     = require('@igojs/db');
const health = require('../src/connect/health');

// .cjs, outside the test glob: mocha would otherwise load it as a test file
// and the script would exit the runner itself.
const SCRIPT = path.join(__dirname, 'fixtures', 'shutdown.cjs');

// several scenarios exit non-zero on purpose, which makes execFileSync throw:
// the output is on the error either way
const run = (mode) => {
  try {
    const out = execFileSync(process.execPath, [SCRIPT, mode], { encoding: 'utf8', stdio: 'pipe' });
    return out.trim().split('\n');
  } catch (err) {
    return err.stdout.trim().split('\n');
  }
};

// shutdown() is one-shot on purpose, so each test drives a freshly required
// copy of the module rather than the one the suite booted.
const freshApp = () => {
  const appPath = require.resolve('../src/app');
  delete require.cache[appPath];
  return require(appPath);
};

describe('Shutdown', function() {
  this.timeout(20000);

  describe('app.shutdown()', function() {

    let dbsClose, cacheClose, onShutdown;

    beforeEach(() => {
      dbsClose   = db.dbs.close;
      cacheClose = cache.close;
      onShutdown = config.onShutdown;
      db.dbs.close = async () => {};
      cache.close  = async () => {};
    });

    afterEach(() => {
      db.dbs.close      = dbsClose;
      cache.close       = cacheClose;
      config.onShutdown = onShutdown;
    });

    // the one ordering that protects from a visible failure: a request still
    // being served once the project drained the pools it needs would fail
    it('should close the server before the project callback', async () => {
      const order = [];
      const instance = freshApp();
      instance.server = { listening: true, close: (cb) => { order.push('server'); cb(); } };
      config.onShutdown = async () => order.push('onShutdown');

      await instance.shutdown();

      assert.deepStrictEqual(order, ['server', 'onShutdown']);
    });

    it('should release the databases and the cache', async () => {
      const closed = new Set();
      const instance = freshApp();
      db.dbs.close = async () => closed.add('dbs');
      cache.close  = async () => closed.add('cache');

      await instance.shutdown();

      assert.deepStrictEqual(closed, new Set(['dbs', 'cache']));
    });

    it('should carry on when the project callback rejects', async () => {
      const closed = new Set();
      const instance = freshApp();
      config.onShutdown = async () => { throw new Error('puppeteer pool is already gone'); };
      db.dbs.close = async () => closed.add('dbs');
      cache.close  = async () => closed.add('cache');

      await instance.shutdown();

      assert.deepStrictEqual(closed, new Set(['dbs', 'cache']));
    });

    it('should run once, however many times it is called', async () => {
      let calls = 0;
      const instance = freshApp();
      config.onShutdown = async () => calls++;

      await instance.shutdown();
      await instance.shutdown();

      assert.strictEqual(calls, 1);
    });

    it('should work without a server, as a cron or a script has none', async () => {
      let called = false;
      const instance = freshApp();
      config.onShutdown = async () => { called = true; };

      await instance.shutdown();

      assert.ok(called);
    });
  });

  describe('readiness while draining', function() {

    // the shutdown tests above drained the shared module
    beforeEach(() => health.drain(false));

    it('should answer 503 so the load balancer takes the instance out', async () => {
      const agent = require('@igojs/server').dev.agent;
      const before = await agent.get('/health/ready');
      assert.strictEqual(before.statusCode, 200);

      health.drain();

      const during = await agent.get('/health/ready');
      assert.strictEqual(during.statusCode, 503);
      assert.strictEqual(during.data.status, 'DOWN');
    });
  });

  describe('signals', function() {

    it('should shut down on SIGTERM and exit 0', () => {
      assert.deepStrictEqual(run('sigterm'), ['shutdown', 'exit:0']);
    });

    it('should shut down on SIGINT and exit 0', () => {
      assert.deepStrictEqual(run('sigint'), ['shutdown', 'exit:0']);
    });

    it('should exit 1 on a second signal rather than keep waiting', () => {
      assert.deepStrictEqual(run('twice'), ['shutdown', 'exit:1']);
    });

    it('should exit 1 when the shutdown outlives config.shutdownTimeout', () => {
      assert.deepStrictEqual(run('hang'), ['shutdown', 'exit:1']);
    });

    it('should install no handler in test env, or mocha would never return', () => {
      assert.deepStrictEqual(run('test-env'), ['handlers:0']);
    });
  });
});
