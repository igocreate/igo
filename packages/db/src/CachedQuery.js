
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
      const transaction = db.currentTransaction();
      if (transaction) {
        transaction.tables.add(query.table);
      } else {
        await QueryCache.bump(query.table);
      }
      return await run();
    }

    return await QueryCache.read(db, schema, query, sqlQuery, run);
  }
};
