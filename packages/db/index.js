
const dependencies = require('./src/dependencies');

// Initialize @igojs/db with dependencies from @igojs/server
function init({ config, cache, logger, utils, errorhandler }) {
  dependencies.config = config;
  dependencies.cache = cache;
  dependencies.logger = logger;
  dependencies.utils = utils;
  dependencies.errorhandler = errorhandler;
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
  get PaginatedOptimizedSql() { return require('./src/PaginatedOptimizedSql'); },
};
