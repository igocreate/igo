

require('./init');


const assert    = require('assert');
const _         = require('lodash');
const redis     = require('redis');

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

    it('should store dates in arrays', async () => {
      await cache.put('ns', 0, [new Date(), { t1: [new Date()] }]);
      const value = await cache.get('ns', 0);
      assert(_.isDate(value[0]));
      assert(_.isDate(value[1].t1[0]));
    });

    it('should not corrupt strings containing an ISO date', async () => {
      const s = 'created on 2024-01-01T10:00:00.000Z by admin';
      await cache.put('ns', 0, s);
      const value = await cache.get('ns', 0);
      assert.strictEqual(value, s);
    });

    it('should keep strings that are exactly an ISO date as strings', async () => {
      const s = '2024-01-01T10:00:00.000Z';
      await cache.put('ns', 0, { s });
      const value = await cache.get('ns', 0);
      assert.strictEqual(value.s, s);
    });

    it('should store falsy values', async () => {
      for (const falsy of [0, '', false]) {
        await cache.put('ns', 'falsy', falsy);
        assert.strictEqual(await cache.get('ns', 'falsy'), falsy);
      }
    });

    it('should store buffers', async () => {
      const buffer = Buffer.from('hello world', 'utf8');
      await cache.put('ns', 0, buffer);
      const value = await cache.get('ns', 0);
      assert(value !== null);
      assert(_.isBuffer(value));
      assert.strictEqual(buffer.toString(), value.toString());
    });

    // v8 refuses what JSON used to drop: store the rest rather than lose the whole value
    it('should drop what it cannot serialize and store the rest', async () => {
      class SomeForm {}
      const value = { title: 'kept', when: new Date(0), fn: () => true, sub: { form: SomeForm, code: 'kept too' } };
      value.self  = value;

      await cache.put('ns', 'lenient', value);
      const stored = await cache.get('ns', 'lenient');

      assert.strictEqual(stored.title, 'kept');
      assert.strictEqual(stored.sub.code, 'kept too');
      assert.strictEqual(stored.fn, undefined);
      assert.strictEqual(stored.sub.form, undefined);
      assert.ok(stored.when instanceof Date, 'Expected the Date to keep its type');
    });

    it('should store a serializable value as is', async () => {
      const value = { when: new Date(0), buf: Buffer.from('hi'), set: new Set([1]), self: null };
      value.self  = value; // a cycle serializes fine, and comes back as a cycle

      await cache.put('ns', 'cyclic', value);
      const stored = await cache.get('ns', 'cyclic');

      assert.strictEqual(stored.self, stored);
      assert.ok(stored.set instanceof Set);
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

  // entries written by a release using the JSON codec
  describe('legacy entries', () => {
    it('should be treated as a miss', async () => {
      const client = redis.createClient(igo.config.redis || {});
      await client.connect();
      await client.set('legacyns/0', JSON.stringify({ v: { t0: new Date() } }));
      await client.destroy();

      assert.strictEqual(await cache.get('legacyns', 0), null);
      assert.deepStrictEqual(await cache.mget('legacyns', [0]), [0]);
    });
  });

  describe('cache.mget', () => {
    it('should return values in order, and 0 for missing keys', async () => {
      await cache.put('mgetns', 'a', { t0: new Date() });
      await cache.put('mgetns', 'b', 'hello');
      const [a, b, c] = await cache.mget('mgetns', ['a', 'b', 'nope']);
      assert(_.isDate(a.t0));
      assert.strictEqual(b, 'hello');
      assert.strictEqual(c, 0);
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
