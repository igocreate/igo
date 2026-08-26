const _            = require('lodash');
const dependencies = require('./dependencies');

const NAMESPACE = '_cache_statistics';
// counters are buffered in memory and flushed by traffic, never by a timer.
// the window only bounds what a dying process loses: getStats() flushes first,
// so stats stay exact whatever the value
const FLUSH_INTERVAL = 30000;

let buffer      = {};
let lastFlush   = Date.now();

//
module.exports.incr = (key, type) => {
  const counts  = buffer[key] || (buffer[key] = {});
  counts[type]  = (counts[type] || 0) + 1;

  if (Date.now() - lastFlush >= FLUSH_INTERVAL) {
    // a stats counter must never turn a healthy request into a 500
    module.exports.flush().catch(err => dependencies.logger.error(err));
  }
};

//
module.exports.flush = async () => {
  const { cache } = dependencies;

  // reset before any await: no concurrent incr can be lost, and the updated
  // lastFlush prevents a second flush from starting
  const pending = buffer;
  buffer        = {};
  lastFlush     = Date.now();

  for (const [table, counts] of Object.entries(pending)) {
    for (const [type, n] of Object.entries(counts)) {
      await cache.incrby(NAMESPACE, `${table}.${type}`, n);
    }
  }
};

//
module.exports.getStats = async () => {
  const { cache } = dependencies;
  const statistics = {};

  await module.exports.flush();

  await cache.scan(`${NAMESPACE}/*`, async (key) => {
    key = key.substr(NAMESPACE.length + 1);
    const value = await cache.get(NAMESPACE, key);
    _.set(statistics, key, value);
  });

  _.each(statistics, (statistic, key) => {
    const hits        = statistic.hits    = statistic.hits    || 0;
    const misses      = statistic.misses  = statistic.misses  || 0;
    // refused queries never reach the cache: not misses
    statistic.skipped = statistic.skipped || 0;
    statistic.table   = key;
    statistic.total   = hits + misses;
    statistic.rate    = statistic.total ? Math.round(hits / statistic.total * 100) : 0;
  });

  return _.values(statistics);
};
