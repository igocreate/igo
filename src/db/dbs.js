

const _           = require('lodash');

const Db          = require('./Db');
const config      = require('../config');
const migrations  = require('./migrations');

// init databases connections
module.exports.init = async () => {
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
