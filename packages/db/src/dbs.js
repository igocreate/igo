

const Db           = require('./Db');
const dependencies = require('./dependencies');
const migrations   = require('./migrations');

// init databases connections
module.exports.init = async () => {
  const { config } = dependencies;
  for (const database of config.databases) {
    const db = new Db(database);
    await db.init();

    if (config.databases.length === 1) {
      db.config.migrations_dir = 'sql';
    }

    module.exports[database] = db;
    await migrations.init(db);
  }

  // main is first database
  module.exports.main = module.exports[config.databases[0]];
};

// get an initialized database
module.exports.get = (name) => {
  const db = module.exports[name];
  if (!db) {
    throw new Error(`Database '${name}' is not initialized. Check config.databases and make sure app.configure() or dbs.init() has completed.`);
  }
  return db;
};

// close databases connections
module.exports.close = async () => {
  const { config, logger } = dependencies;
  for (const database of config.databases) {
    const db = module.exports[database];
    if (!db) {
      continue;
    }
    try {
      await db.close();
    } catch (err) {
      logger.error(`Could not close database '${database}': ${err.message}`);
    }
  }
};
