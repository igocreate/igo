require('../init');

const assert = require('assert');
const agent  = require('../../src/dev/test/agent');


describe('Flash middleware', () => {

  describe('req.flash() with small data', () => {
    it('should store small objects in session', async () => {
      const res = await agent.post('/flash/small');
      assert.strictEqual(res.statusCode, 200);

      const body = JSON.parse(res.body);
      assert.strictEqual(body.ok, true);
      assert.strictEqual(body.session.message, 'Small message');
      assert.deepStrictEqual(body.session.data, { id: 1, name: 'test' });
    });
  });

  describe('req.flash() with large data', () => {
    it('should auto-switch to cacheflash when object > 1KB', async () => {
      const res = await agent.post('/flash/large');
      assert.strictEqual(res.statusCode, 200);

      const body = JSON.parse(res.body);
      assert.strictEqual(body.ok, true);
      assert.strictEqual(body.usedCacheflash, true, 'Should have used cacheflash');
      assert(body.sessionSize < 100, 'Session flash should be small (only contains UUID)');
    });
  });

  describe('req.cacheflash()', () => {
    it('should store data in Redis with UUID in session', async () => {
      const res = await agent.post('/cacheflash');
      assert.strictEqual(res.statusCode, 200);

      const body = JSON.parse(res.body);
      assert.strictEqual(body.ok, true);
      assert.strictEqual(body.cacheflashCount, 1);
    });
  });

  describe('Flash data retrieval', () => {
    it('should load cacheflash data on GET request', async () => {
      // First POST to set flash
      const session = {};
      await agent.post('/cacheflash', { session });

      // Then GET to read flash (simulating redirect)
      const res = await agent.get('/flash/read', { session });
      assert.strictEqual(res.statusCode, 200);

      const body = JSON.parse(res.body);
      assert(body.flash.bigdata, 'Should have loaded bigdata from cacheflash');
      assert(body.flash.bigdata.items, 'Should have items array');
      assert.strictEqual(body.flash.bigdata.items.length, 300);
    });

    it('should clear flash data after GET request', async () => {
      const session = {};

      // Set flash
      await agent.post('/flash/small', { session });

      // First GET - should have data
      const res1 = await agent.get('/flash/read', { session });
      const body1 = JSON.parse(res1.body);
      assert.strictEqual(body1.flash.message, 'Small message');

      // Second GET - should be empty (flash cleared)
      const res2 = await agent.get('/flash/read', { session });
      const body2 = JSON.parse(res2.body);
      assert.deepStrictEqual(body2.flash, {});
    });
  });

});
