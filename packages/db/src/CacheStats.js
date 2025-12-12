const _         = require('lodash');
const context   = require('./context');

const NAMESPACE = '_cache_statistics';

//
module.exports.incr = (key, type) => {
  const { cache } = context;
  cache.incr(NAMESPACE, `${key}.${type}`);
};

//
module.exports.getStats = async () => {
  const { cache } = context;
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
