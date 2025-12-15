
const context = require('./src/context');

// Initialize @igojs/db with dependencies from @igojs/server
function init({ config, cache, logger, utils, errorhandler }) {
  context.config = config;
  context.cache = cache;
  context.logger = logger;
  context.utils = utils;
  context.errorhandler = errorhandler;
}

module.exports = {
  init,
  get Model() { return require('./src/Model'); },
  get Query() { return require('./src/Query'); },
  get CachedQuery() { return require('./src/CachedQuery'); },
  get Schema() { return require('./src/Schema'); },
  get Sql() { return require('./src/Sql'); },
  get Db() { return require('./src/Db'); },
  get dbs() { return require('./src/dbs'); },
  get migrations() { return require('./src/migrations'); },
  get DataTypes() { return require('./src/DataTypes'); },
  get CacheStats() { return require('./src/CacheStats'); },
  get PaginatedOptimizedQuery() { return require('./src/PaginatedOptimizedQuery'); },
  get PaginatedOptimizedSql() { return require('./src/PaginatedOptimizedSql'); },
};
