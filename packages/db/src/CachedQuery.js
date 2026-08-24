
const Query       = require('./Query');
const QueryCache  = require('./QueryCache');

// verbs that read: cached. anything else is treated as a write and bumps the table version
const READ_VERBS  = ['select', 'count'];

//
module.exports = class CachedQuery extends Query {

  async runQuery() {
    const { query, schema } = this;
    const sqlQuery  = this.toSQL();
    const db        = this.getDb();
    const run       = () => db.query(sqlQuery.sql, sqlQuery.params, query.options);

    if (!READ_VERBS.includes(query.verb)) {
      await QueryCache.bump(query.table);
      return await run();
    }

    if (!QueryCache.cacheable(schema, query)) {
      return await run();
    }

    return await QueryCache.read(schema, query, sqlQuery, run);
  }
};
