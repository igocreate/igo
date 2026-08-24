require('./init');

const assert = require('assert');
const Model  = require('@igojs/db').Model;
const cache  = require('@igojs/server').cache;
const Db     = require('@igojs/db').Db;

describe('db.CachedQuery', function () {

  class Book extends Model({
    table:   'books',
    primary: ['id'],
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

  // same table, without cache: control group for the count tests
  class PlainBook extends Model({
    table:   'books',
    primary: ['id'],
    columns: [
      'id',
      'code',
      'title',
      'created_at'
    ]
  }) {}

  const dbQuery = Db.prototype.query;

  // count the SQL statements actually sent to the database
  const countSql = async (fn) => {
    const sqls = [];
    Db.prototype.query = function (sql, params, options) {
      sqls.push(sql);
      return dbQuery.call(this, sql, params, options);
    };
    await fn();
    Db.prototype.query = dbQuery;
    return sqls;
  };

  describe('find', function () {

    const key = id => '{"sql":"SELECT `books`.* FROM `books` WHERE `books`.`id` = ? ORDER BY `books`.`id` ASC LIMIT ?, ?","params":[' + id + ',0,1]}';

    it('should put rows in cache (versioned namespace)', async () => {
      const book1 = await Book.create();
      const book  = await Book.find(book1.id);

      assert.strictEqual(book.id, book1.id);

      const version = await cache.get('_cached_versions', 'books') || 0;
      const rows = await cache.get(`_cached.books.v${version}`, key(book1.id));
      assert.ok(rows, 'Expected cached rows to exist');
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0].id, book.id);
    });

    it('should bump the table version after a write', async function () {
      const book1   = await Book.create();
      const version = await cache.get('_cached_versions', 'books');
      await book1.update({ title: 'abc' });

      const newVersion = await cache.get('_cached_versions', 'books');
      assert.ok(newVersion > version, 'Expected version to be bumped after update');
    });

    it('should not serve stale data after update', async function () {
      const book1  = await Book.create();
      const before = await Book.find(book1.id); // populate cache
      assert.notStrictEqual(before.title, 'xyz');

      await book1.update({ title: 'xyz' });

      const after = await Book.find(book1.id);
      assert.strictEqual(after.title, 'xyz');
    });

  });

  describe('count', function () {

    it('should cache count queries', async function () {
      await Book.create({ code: 'countme' });

      const first  = await countSql(() => Book.where({ code: 'countme' }).count());
      const second = await countSql(() => Book.where({ code: 'countme' }).count());

      assert.strictEqual(first.filter(sql => sql.includes('COUNT')).length, 1);
      assert.strictEqual(second.filter(sql => sql.includes('COUNT')).length, 0);
    });

    it('should serve the count from cache and not from the database', async function () {
      await Book.create({ code: 'provenance' });
      assert.strictEqual(await Book.where({ code: 'provenance' }).count(), 1); // populates the cache

      // same table, but PlainBook is not cached: the write does not invalidate anything
      await PlainBook.create({ code: 'provenance' });

      // the database now holds 2 rows...
      assert.strictEqual(await PlainBook.where({ code: 'provenance' }).count(), 2);
      // ...but the cached count still answers 1, so it came from the cache
      assert.strictEqual(await Book.where({ code: 'provenance' }).count(), 1);

      // a write through the ORM invalidates it, and the real count comes back
      await Book.create({ code: 'unrelated' });
      assert.strictEqual(await Book.where({ code: 'provenance' }).count(), 2);
    });

    it('should NOT bump the table version (would flush the table on every count)', async function () {
      await Book.create({ code: 'noflush' });
      const version = await cache.get('_cached_versions', 'books');

      await Book.where({ code: 'noflush' }).count();
      await Book.count();

      const after = await cache.get('_cached_versions', 'books');
      assert.strictEqual(after, version);
    });

    it('should cache the count of a paginated list', async function () {
      await Book.create({ code: 'paged' });

      await Book.where({ code: 'paged' }).page(1, 10).list();
      const sqls = await countSql(() => Book.where({ code: 'paged' }).page(1, 10).list());

      assert.strictEqual(sqls.length, 0);
    });

  });

});
