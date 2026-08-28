const cache = require('../../src/cache');

// simulate an unreachable redis for the enclosing describe
module.exports = () => {

  let isAvailable;

  beforeEach(() => {
    isAvailable = cache.isAvailable;
    cache.isAvailable = () => false;
  });

  afterEach(() => {
    cache.isAvailable = isAvailable;
  });

  // writes made while the cache was down never bumped their table version, so what is left
  // may contradict the database: flush, like the reconnection does
  after(async () => {
    await cache.flushdb();
  });

};
