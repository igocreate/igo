

require('./init');


const assert    = require('assert');
const _         = require('lodash');

const igo       = require('@igojs/server');
const cache     = igo.cache;

const utils = {
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

describe('igo.cache', () => {

  describe('cache.get', () => {
    it('should return undefined if key is not found', async () => {
      const value = await cache.get('nsx', 0);
      assert(value === null);
    });
  });

  describe('cache.put', () => {

    it('should store string values', async () => {
      await cache.put('ns', 0, 'hello');
      const value = await cache.get('ns', 0);
      assert(value === 'hello');
    });

    it('should store null values', async () => {
      await cache.put('ns', 0, null);
      const value = await cache.get('ns', 0);
      assert(value === null);
    });

    it('should store dates', async () => {
      await cache.put('ns', 0, new Date());
      const value = await cache.get('ns', 0);
      assert(value !== null);
      assert(_.isDate(value));
    });

    it('should store objects with dates', async () => {
      await cache.put('ns', 0, { t0: new Date() });
      const value = await cache.get('ns', 0);
      assert(value !== null);
      assert(_.isDate(value.t0));
    });

    it('should not corrupt strings containing an ISO date', async () => {
      const s = 'created on 2024-01-01T10:00:00.000Z by admin';
      await cache.put('ns', 0, s);
      const value = await cache.get('ns', 0);
      assert.strictEqual(value, s);
    });

    it('should store buffers', async () => {
      const buffer = Buffer.from('hello world', 'utf8');
      await cache.put('ns', 0, buffer);
      const value = await cache.get('ns', 0);
      assert(value !== null);
      assert(_.isBuffer(value));
      assert.strictEqual(buffer.toString(), value.toString());
    });
  });

  describe('cache.fetch', () => {
    it('should invoke func on miss and cache the result', async () => {
      let calls = 0;
      const func = async () => { calls++; return 'value'; };
      assert.strictEqual(await cache.fetch('fetchns', 'k1', func), 'value');
      assert.strictEqual(await cache.fetch('fetchns', 'k1', func), 'value');
      assert.strictEqual(calls, 1);
    });

    it('should treat cached falsy values as hits', async () => {
      for (const falsy of [0, false, '']) {
        let calls = 0;
        const func = async () => { calls++; return falsy; };
        assert.strictEqual(await cache.fetch('fetchns', 'falsy' + typeof falsy, func), falsy);
        assert.strictEqual(await cache.fetch('fetchns', 'falsy' + typeof falsy, func), falsy);
        assert.strictEqual(calls, 1);
      }
    });
  });

  describe('cache.incr', () => {
    it('should increment value', async () => {
      await cache.incr('ns', 'key');
      await cache.incr('ns', 'key');
      const value = await cache.get('ns', 'key');
      assert.strictEqual(value, 2);
    });
  });

  // info
  describe('cache.info', () => {
    it('should show info', async () => {
      const info = await cache.info();
      assert.match(info, /redis_version/);
    });
  });

  // scan
  describe('cache.scan', () => {
    it('should scan for keys', async () => {
      await cache.put('scantest', 120, 'hello');
      await cache.put('scantest', 121, 'hello');
      await cache.put('scantest', 122, 'hello');
      const keys = [];
        
      cache.scan('scantest/*', async (key) => {
        keys.push(key);
      });
      await utils.wait(100);
      assert.strictEqual(keys.length, 3);
      assert(keys.indexOf('scantest/122') > -1);
    });
  });
});
