

require('./init');

const assert    = require('assert');

const Model       = require('@igojs/db').Model;
const CacheStats  = require('@igojs/db').CacheStats;
const cache       = require('@igojs/server').cache;

const NAMESPACE   = '_cache_statistics';

//
describe('db.CacheStats', function() {

  class Book extends Model({
    table:    'books',
    primary:  ['id'],
    columns: [
      'id',
      'code',
      'title',
      'created_at'
    ],
    cache: {
      ttl: 100
    }
  }) {}

  // counters are global: drain the buffer, then what previous tests left in redis
  beforeEach(async () => {
    await CacheStats.flush();
    await cache.flush(`${NAMESPACE}/*`);
  });

  //
  describe('getStats', function() {

    it('should save stats in cache', async () => {
      const book1 = await Book.create();
      await Book.find(book1.id);
      const stats = await CacheStats.getStats();
      assert.strictEqual(stats.length, 1);
      assert.strictEqual(stats[0].hits, 1);
      assert.strictEqual(stats[0].total, 2);
      assert.strictEqual(stats[0].table, 'books');
    });

    // a query the cache had to refuse is neither a hit nor a miss
    it('should count uncacheable queries as skipped', async () => {
      await Book.where('id IN (SELECT id FROM books)').list();

      const stats = await CacheStats.getStats();
      assert.strictEqual(stats[0].skipped, 1);
      assert.strictEqual(stats[0].total, 0);
      assert.strictEqual(stats[0].rate, 0);
    });
  });

  //
  describe('flush', function() {

    it('should not write to redis on the query path', async () => {
      const book = await Book.create();
      await Book.find(book.id);

      // still buffered in memory: the flush interval has not elapsed
      assert.strictEqual(await cache.get(NAMESPACE, 'books.hits'), null);

      await CacheStats.flush();
      assert.strictEqual(await cache.get(NAMESPACE, 'books.hits'), 1);
    });

    it('should accumulate counters into a single incrby', async () => {
      const incrby = cache.incrby;
      const calls  = [];
      cache.incrby = async (namespace, id, value) => {
        calls.push([id, value]);
        return await incrby(namespace, id, value);
      };

      const book = await Book.create();
      for (let i = 0; i < 5; i++) {
        await Book.find(book.id);
      }
      await CacheStats.flush();
      cache.incrby = incrby;

      assert.deepStrictEqual(calls.sort(), [['books.hits', 5], ['books.misses', 1]]);
    });
  });
});
