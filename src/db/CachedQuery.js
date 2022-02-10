
const cache   = require('../cache');

const Query       = require('./Query');
const CacheStats  = require('./CacheStats');

module.exports = class CachedQuery extends Query {
  
  runQuery(callback) {
    const { query, schema } = this;
    const sqlQuery  = this.toSQL();
    const db        = this.getDb();

    const namespace = '_cached.' + query.table;

    if (query.verb !== 'select') {
      cache.flush(namespace + '/*');
      return db.query(sqlQuery.sql, sqlQuery.params, query.options, callback);
    }

    const key = JSON.stringify(sqlQuery);
    let type  = 'hits';
    cache.fetch(namespace, key, (id, callback) => {
      type  = 'misses';
      db.query(sqlQuery.sql, sqlQuery.params, query.options, callback);
    }, (err, result) => {
      callback(err, result);
      CacheStats.incr(query.table, type);
    }, schema.cache.ttl);
  }
};
