const _         = require('lodash');
const cache     = require('../cache');

const NAMESPACE = '_cache_statistics';

//
module.exports.incr = (key, type) => {
  cache.incr(NAMESPACE, `${key}.${type}`);
};

//
module.exports.getStats = (callback) => {
  const statistics = {};

  cache.scan(`${NAMESPACE}/*`, (key, callback) => {
    key = key.substr(NAMESPACE.length + 1);
    cache.get(NAMESPACE, key, (err, value) => {
      _.set(statistics, key, value);
      callback();
    });
  }, () => {

    _.each(statistics, (statistic, key) => {
      let { hits, misses } = statistic;
      hits            = hits || 0;
      misses          = misses || 0;
      statistic.table = key;
      statistic.total = hits + misses;
      statistic.rate  = Math.round(hits / statistic.total * 100);
    });

    callback(null, _.values(statistics));
  });
};
