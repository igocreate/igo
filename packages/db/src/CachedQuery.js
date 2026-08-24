
const context     = require('./context');

const Query       = require('./Query');
const CacheStats  = require('./CacheStats');

const VERSIONS_NS = '_cached_versions';
// verbs that read: cached. anything else is treated as a write and bumps the table version
const READ_VERBS   = ['select', 'count'];
// entries from outdated versions are only reclaimed by expiration
const DEFAULT_TTL = 24 * 3600;

//
module.exports = class CachedQuery extends Query {

  async runQuery() {
    const { cache } = context;
    const { query, schema } = this;
    const sqlQuery  = this.toSQL();
    const db        = this.getDb();

    if (!READ_VERBS.includes(query.verb)) {
      // bump the table version: invalidates all cached selects with a single INCR
      await cache.incr(VERSIONS_NS, query.table);
      return await db.query(sqlQuery.sql, sqlQuery.params, query.options);
    }

    const version   = await cache.get(VERSIONS_NS, query.table) || 0;
    const namespace = `_cached.${query.table}.v${version}`;
    const key = JSON.stringify(sqlQuery);
    let type  = 'hits';

    const result = await cache.fetch(
      namespace,
      key,
      async () => {
        type = 'misses';
        return await db.query(sqlQuery.sql, sqlQuery.params, query.options);
      },
      schema.cache.ttl || DEFAULT_TTL
    );

    CacheStats.incr(query.table, type);
    return result;
  }
};
