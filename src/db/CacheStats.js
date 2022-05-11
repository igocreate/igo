const _         = require('lodash');
const cache     = require('../cache');

const NAMESPACE = '_cache_statistics';

//
module.exports.incr = (key, type) => {
  cache.incr(NAMESPACE, `${key}.${type}`);
};

//
module.exports.getStats = async () => {
  const statistics = {};

  await cache.scan(`${NAMESPACE}/*`, async (key) => {
    key = key.substr(NAMESPACE.length + 1);
    const value = await cache.get(NAMESPACE, key);
    _.set(statistics, key, value);
  });

  _.each(statistics, (statistic, key) => {
    let { hits, misses } = statistic;
    hits            = hits || 0;
    misses          = misses || 0;
    statistic.table = key;
    statistic.total = hits + misses;
    statistic.rate  = Math.round(hits / statistic.total * 100);
  });

  return _.values(statistics);
};
