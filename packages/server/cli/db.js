
const _           = require('lodash');

const config      = require('../src/config');
const cache       = require('../src/cache');
const logger      = require('../src/logger');
const utils       = require('../src/utils');
const errorhandler = require('../src/connect/errorhandler');
const db          = require('@igo/db');

// db verbs
const verbs   = {

  // igo db migrate
  migrate: async (args) => {
    for (const database of config.databases) {
      const dbInstance = db.dbs[database];
      dbInstance.config.debugsql = false;
      if (config.databases.length > 1) {
        console.log(`database: ${dbInstance.config.database}`);
      }
      await db.migrations.migrate(dbInstance);
    }
  },

  // igo db migrations
  migrations: async (args) => {

    for (const database of config.databases) {
      const dbInstance = db.dbs[database];
      dbInstance.config.debugsql = false;
      if (config.databases.length > 1) {
        console.log(`database: ${dbInstance.config.database}`);
      }
      let migrationsList  = await db.migrations.list(dbInstance);
      migrationsList      = _.reverse(migrationsList);
      migrationsList.forEach((migration) => {
        console.log([
          migration.id,
          (migration.success ? '✅' : '❌'),
          migration.file
        ].join('  '));
      });
    }
  },

  // igo db reset
  reset: async (args) => {
    if (config.databases.length > 1 && !args[2]) {
      console.log(`Please select database to reset : igo db reset [${config.databases.join('|')}]`);
      return;
    }

    if (args[2] && config.databases.indexOf(args[2]) < 0) {
      console.log('ERROR: Wrong database name');
      return;
    }

    const dbInstance = args[2] ? db.dbs[args[2]] : db.dbs.main;
    const database = dbInstance.config.database;

    console.log('WARNING: Database will be reset, data will be lost!');
    console.log('Confirm the database name (' + database + '):');

    await new Promise((resolve) => {
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      process.stdin.on('data', async (data) => {
        const input = data.toString().trim();
        if (input !== database) {

          return resolve();
        }

        dbInstance.config.debugsql = false;
        dbInstance.config.database = null;
        await dbInstance.init();

        const { dialect }     = dbInstance.driver;
        const DROP_DATABASE   = dialect.dropDb(database);
        const CREATE_DATABASE = dialect.createDb(database);

        await dbInstance.query(DROP_DATABASE);
        await dbInstance.query(CREATE_DATABASE);
        dbInstance.config.database = database;
        await dbInstance.init();
        await db.migrations.migrate(dbInstance);

        resolve();
      });
    });
  },

};

// igo db
module.exports = async (argv) => {

  const args = argv._;

  config.init();

  // Initialize @igo/db with injected dependencies
  db.init({
    config,
    cache,
    logger,
    utils,
    errorhandler,
  });

  await db.dbs.init();

  if (args.length > 1 && verbs[args[1]]) {
    await verbs[args[1]](args)
    console.log('Done.');
    process.exit(0);
  } else {
    console.error('ERROR: Wrong options');
    console.error('Usage: igo db [migrate|migrations|reset]');
  }
};
