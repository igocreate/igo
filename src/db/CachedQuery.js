
const cache       = require('../cache');

const Query       = require('./Query');
const CacheStats  = require('./CacheStats');

// 
module.exports = class CachedQuery extends Query {
  
  async runQuery() {
    const { query, schema } = this;
    const sqlQuery  = this.toSQL();
    const db        = this.getDb();

    const namespace = '_cached.' + query.table;

    if (query.verb !== 'select') {
      cache.flush(namespace + '/*'); // non-blocking flush for performance
      const result = await db.query(sqlQuery.sql, sqlQuery.params, query.options);
      return result;
    }

    const key = JSON.stringify(sqlQuery);
    let type  = 'hits';

    const result = await cache.fetch(
      namespace, 
      key, 
      async () => {
        type = 'misses';
        return await db.query(sqlQuery.sql, sqlQuery.params, query.options);
      }, 
      schema.cache.ttl
    );

    CacheStats.incr(query.table, type);
    return result;
  }
};
