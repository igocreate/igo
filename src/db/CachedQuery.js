
const cache       = require('../cache');

const Query       = require('./Query');
const CacheStats  = require('./CacheStats');


// 
module.exports = class CachedQuery extends Query {
  
  runQuery(callback) {
    const { query, schema } = this;
    const sqlQuery  = this.toSQL();
    const db        = this.getDb();

    const namespace = '_cached.' + query.table;

    if (query.verb !== 'select') {
      cache.flush(namespace + '/*');
      db.query(sqlQuery.sql, sqlQuery.params, query.options, (err, res) => {
        callback(err, res);
      });
      return;
    }

    const key = JSON.stringify(sqlQuery);
    let type  = 'hits';
    
    cache.fetch(namespace, key, () => {
      type  = 'misses';
      return new Promise((resolve, reject) => {
        db.query(sqlQuery.sql, sqlQuery.params, query.options, (err, res) => {
          return err ? reject(err) : resolve(res);
        });
      });
    }, schema.cache.ttl)
    .then(result => {
      //
      CacheStats.incr(query.table, type);
      callback(null, result);
    });

  }
};
