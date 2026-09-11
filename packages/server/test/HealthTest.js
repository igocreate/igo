require('./init');

const assert = require('assert');
const cache  = require('../src/cache');
const config = require('../src/config');
const db     = require('@igojs/db');
const agent  = require('@igojs/server').dev.agent;

describe('Health', function() {

  describe('liveness', function() {

    it('should answer without touching a dependency', async () => {
      const res = await agent.get('/health');
      assert.strictEqual(res.statusCode, 200);
      assert.deepStrictEqual(res.data, { status: 'UP' });
    });
  });

  describe('readiness', function() {

    it('should report every probed dependency', async () => {
      const res = await agent.get('/health/ready');
      assert.strictEqual(res.statusCode, 200);
      assert.deepStrictEqual(res.data, {
        status: 'UP',
        components: {
          db:    { status: 'UP' },
          cache: { status: 'UP' },
          disk:  { status: 'UP' },
        },
      });
    });

    it('should answer 503 when a dependency is down', async () => {
      const query = db.dbs.main.query;
      db.dbs.main.query = async () => {
        throw new Error('connection refused to 10.0.0.5:3306');
      };

      try {
        const res = await agent.get('/health/ready');
        assert.strictEqual(res.statusCode, 503);
        assert.strictEqual(res.data.status, 'DOWN');
        assert.deepStrictEqual(res.data.components.db, { status: 'DOWN' });
        assert.deepStrictEqual(res.data.components.cache, { status: 'UP' });
      } finally {
        db.dbs.main.query = query;
      }
    });

    it('should expose no error detail, which names hosts and ports', async () => {
      const query = db.dbs.main.query;
      db.dbs.main.query = async () => {
        throw new Error('connection refused to 10.0.0.5:3306');
      };

      try {
        const res = await agent.get('/health/ready');
        assert.ok(!JSON.stringify(res.data).includes('10.0.0.5'));
      } finally {
        db.dbs.main.query = query;
      }
    });

    it('should stay ready when an optional dependency is down', async () => {
      const isAvailable = cache.isAvailable;
      cache.isAvailable = () => false;

      try {
        const res = await agent.get('/health/ready');
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.data.status, 'UP');
        assert.deepStrictEqual(res.data.components.cache, { status: 'DOWN' });
      } finally {
        cache.isAvailable = isAvailable;
      }
    });

    it('should answer 503 when that same dependency is declared critical', async () => {
      const isAvailable = cache.isAvailable;
      const setting     = config.health.cache;
      cache.isAvailable  = () => false;
      config.health.cache = true;

      try {
        const res = await agent.get('/health/ready');
        assert.strictEqual(res.statusCode, 503);
        assert.strictEqual(res.data.status, 'DOWN');
      } finally {
        cache.isAvailable  = isAvailable;
        config.health.cache = setting;
      }
    });

    it('should answer 503 rather than hang on a dependency that never answers', async () => {
      const query   = db.dbs.main.query;
      const timeout = config.health.timeout;
      config.health.timeout = 50;
      db.dbs.main.query = () => new Promise(() => {});

      try {
        const res = await agent.get('/health/ready');
        assert.strictEqual(res.statusCode, 503);
        assert.deepStrictEqual(res.data.components.db, { status: 'DOWN' });
      } finally {
        db.dbs.main.query = query;
        config.health.timeout = timeout;
      }
    });

    it('should probe only what the config asks for', async () => {
      config.health.cache = false;
      config.health.disk  = false;

      try {
        const res = await agent.get('/health/ready');
        assert.deepStrictEqual(res.data.components, { db: { status: 'UP' } });
      } finally {
        config.health.cache = true;
        config.health.disk  = 50 * 1024 * 1024;
      }
    });

    it('should report the disk down below the free space threshold', async () => {
      const threshold = config.health.disk;
      // more than any disk holds, so the probe cannot pass
      config.health.disk = Number.MAX_SAFE_INTEGER;

      try {
        const res = await agent.get('/health/ready');
        assert.strictEqual(res.statusCode, 503);
        assert.deepStrictEqual(res.data.components.disk, { status: 'DOWN' });
      } finally {
        config.health.disk = threshold;
      }
    });

    it('should expose neither the free space nor the threshold', async () => {
      const threshold = config.health.disk;
      config.health.disk = Number.MAX_SAFE_INTEGER;

      try {
        const res = await agent.get('/health/ready');
        assert.deepStrictEqual(Object.keys(res.data.components.disk), ['status']);
      } finally {
        config.health.disk = threshold;
      }
    });
  });

  describe('request log', function() {

    it('should not log the probes', async () => {
      const logger = require('../src/logger');
      const log    = logger.log;
      const lines  = [];
      logger.log = (level, message, meta) => lines.push({ level, message, meta });

      try {
        await agent.get('/health');
        await agent.get('/health/ready');
        assert.deepStrictEqual(lines.filter(l => l.message === 'request'), []);
      } finally {
        logger.log = log;
      }
    });
  });
});
