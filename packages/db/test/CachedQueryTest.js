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

    it('should put rows in cache, stamped with the table versions', async () => {
      const book1 = await Book.create();
      const book  = await Book.find(book1.id);

      assert.strictEqual(book.id, book1.id);

      const entry = await cache.get('_cached.books', key(book1.id));
      assert.ok(entry, 'Expected cached entry to exist');
      assert.strictEqual(entry.rows.length, 1);
      assert.strictEqual(entry.rows[0].id, book.id);

      const version = await cache.get('_cached_versions', 'books') || 0;
      assert.deepStrictEqual(entry.versions, [version]);
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

    // db.query always returns rows, so this caches [{count: 0}], not a falsy value
    it('should cache a count of zero', async function () {
      const run = () => Book.where({ code: 'no-such-code' }).count();

      assert.strictEqual(await run(), 0);
      const sqls = await countSql(run);

      assert.strictEqual(sqls.length, 0, 'Expected the zero count to be served from cache');
    });

    it('should cache an empty list', async function () {
      const run = () => Book.where({ code: 'no-such-code-either' }).list();

      assert.deepStrictEqual(await run(), []);
      const sqls = await countSql(run);

      assert.strictEqual(sqls.length, 0, 'Expected the empty list to be served from cache');
    });

    it('should cache the count of a paginated list', async function () {
      await Book.create({ code: 'paged' });

      await Book.where({ code: 'paged' }).page(1, 10).list();
      const sqls = await countSql(() => Book.where({ code: 'paged' }).page(1, 10).list());

      assert.strictEqual(sqls.length, 0);
    });

  });

  describe('joins', function () {

    class CachedLibrary extends Model({
      table:   'libraries',
      primary: ['id'],
      columns: ['id', 'title', 'collection', 'created_at'],
      cache:   { ttl: 100 }
    }) {}

    class PlainLibrary extends Model({
      table:   'libraries',
      primary: ['id'],
      columns: ['id', 'title', 'collection', 'created_at']
    }) {}

    class CachedCountry extends Model({
      table:   'countries',
      primary: ['id'],
      columns: ['id', 'name'],
      cache:   { ttl: 100 }
    }) {}

    class CachedCity extends Model({
      table:   'cities',
      primary: ['id'],
      columns: ['id', 'name', 'country_id'],
      cache:   { ttl: 100 },
      associations: () => ([
        ['belongs_to', 'country', CachedCountry, 'country_id', 'id'],
      ])
    }) {}

    class NestedLibrary extends Model({
      table:   'libraries',
      primary: ['id'],
      columns: ['id', 'title', 'city_id'],
      cache:   { ttl: 100 },
      associations: () => ([
        ['belongs_to', 'city', CachedCity, 'city_id', 'id'],
      ])
    }) {}

    class NestingBook extends Model({
      table:   'books',
      primary: ['id'],
      columns: ['id', 'code', 'library_id'],
      cache:   { ttl: 100 },
      associations: () => ([
        ['belongs_to', 'library', NestedLibrary, 'library_id', 'id'],
      ])
    }) {}

    // default scope silently joins an uncached model
    class ScopedBook extends Model({
      table:   'books',
      primary: ['id'],
      columns: ['id', 'code', 'library_id'],
      cache:   { ttl: 100 },
      associations: () => ([
        ['belongs_to', 'library', PlainLibrary, 'library_id', 'id'],
      ]),
      scopes:  { default: query => query.join('library') }
    }) {}

    class JoiningBook extends Model({
      table:   'books',
      primary: ['id'],
      columns: ['id', 'code', 'title', 'library_id', 'created_at'],
      cache:   { ttl: 100 },
      associations: () => ([
        ['belongs_to', 'library', CachedLibrary, 'library_id', 'id'],
        ['belongs_to', 'plain_library', PlainLibrary, 'library_id', 'id'],
      ])
    }) {}

    it('should stamp the entry with every joined table version', async function () {
      const library = await CachedLibrary.create({ title: 'joined' });
      await JoiningBook.create({ code: 'joins', library_id: library.id });

      await JoiningBook.where({ code: 'joins' }).join('library').list();

      // tables are sorted: ['books', 'libraries']
      const versions = await cache.mget('_cached_versions', ['books', 'libraries']);
      const entries  = [];
      await cache.scan('_cached.books/*', async (k) => entries.push(k));

      const stamped = await Promise.all(entries.map(k =>
        cache.get('_cached.books', k.replace('_cached.books/', ''))));
      const joined  = stamped.find(e => e && e.versions.length === 2);

      assert.ok(joined, 'Expected a cached entry stamped with two table versions');
      assert.deepStrictEqual(joined.versions, versions);
    });

    it('should invalidate when the joined table is written', async function () {
      const library = await CachedLibrary.create({ title: 'before' });
      await JoiningBook.create({ code: 'invalidate', library_id: library.id });

      const run = () => JoiningBook.where({ code: 'invalidate' }).join('library').list();

      await run();                                  // populates the cache
      assert.strictEqual((await countSql(run)).length, 0, 'Expected a cache hit');

      await library.update({ title: 'after' });     // writes the joined table

      const sqls = await countSql(run);
      assert.ok(sqls.length > 0, 'Expected the join to be invalidated by the library write');
    });

    it('should not cache a join on a table without its own cache', async function () {
      const library = await PlainLibrary.create({ title: 'uncached' });
      await JoiningBook.create({ code: 'nocache', library_id: library.id });

      const run = () => JoiningBook.where({ code: 'nocache' }).join('plain_library').list();

      await run();
      const sqls = await countSql(run);

      assert.ok(sqls.length > 0, 'Expected the query to never be served from cache');
    });

    // nested joins are flattened into query.joins at build time, so every level counts
    it('should cover every level of a nested join', async function () {
      const country = await CachedCountry.create({ name: 'deep' });
      const city    = await CachedCity.create({ name: 'deep', country_id: country.id });
      const library = await CachedLibrary.create({ title: 'deep', city_id: city.id });
      await NestingBook.create({ code: 'nested', library_id: library.id });

      const run = () => NestingBook.where({ code: 'nested' }).join({ library: { city: 'country' } }).list();

      await run();
      assert.strictEqual((await countSql(run)).length, 0, 'Expected a cache hit');

      await country.update({ name: 'deeper' }); // deepest table, 3 levels down

      assert.ok((await countSql(run)).length > 0, 'Expected the deepest join to invalidate the entry');
    });

    // scopes are applied in execute(), before runQuery: joins they add are seen
    it('should account for joins added by a scope', async function () {
      await ScopedBook.create({ code: 'scoped' });

      const run = () => ScopedBook.where({ code: 'scoped' }).list();

      await run();
      const sqls = await countSql(run);

      assert.ok(sqls.length > 0, 'Expected the scope-added uncached join to prevent caching');
    });

  });

  describe('round trips', function () {

    it('should read the entry and the versions in parallel', async function () {
      const book = await Book.create();
      await Book.find(book.id); // populates the cache

      const cacheGet  = cache.get;
      const cacheMget = cache.mget;
      const calls     = [];

      cache.get  = (ns, id)  => { calls.push(`get:${ns}`);  return cacheGet(ns, id); };
      cache.mget = (ns, ids) => { calls.push(`mget:${ns}`); return cacheMget(ns, ids); };

      await Book.find(book.id);

      cache.get  = cacheGet;
      cache.mget = cacheMget;

      assert.deepStrictEqual(calls, ['get:_cached.books', 'mget:_cached_versions']);
    });

  });

});
