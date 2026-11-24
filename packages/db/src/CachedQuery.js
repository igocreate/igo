
const Query        = require('./Query');
const QueryCache   = require('./QueryCache');
const dependencies = require('./dependencies');

// verbs that read: cached. anything else is treated as a write and bumps the table version
const READ_VERBS  = ['select', 'count'];

// the write is done (or has failed with its own error): a cache that cannot be invalidated
// must neither turn it into a failure nor mask the original error
const bumpAfterWrite = async (table) => {
  try {
    await QueryCache.bump(table);
  } catch (err) {
    dependencies.logger.error(`CachedQuery: cache invalidation failed after write on '${table}': ${err.message}`);
  }
};

//
module.exports = class CachedQuery extends Query {

  async runQuery() {
    const { query, schema } = this;
    const sqlQuery  = this.toSQL();
    const db        = this.getDb();
    const run       = () => db.query(sqlQuery.sql, sqlQuery.params, query.options);

    if (!READ_VERBS.includes(query.verb)) {
      const transaction = db.currentTransaction();
      if (transaction) {
        transaction.tables.add(query.table);
        return await run();
      }
      // bump *after* the write, as the readers expect (see QueryCache.readThrough): bumped before,
      // a read between the bump and the write would cache the old rows under the new version.
      // Also after a failed write, so nothing stale is left behind
      try {
        return await run();
      } finally {
        await bumpAfterWrite(query.table);
      }
    }

    return await QueryCache.read(db, schema, query, sqlQuery, run);
  }
};
