
const fs          = require('fs');
const path        = require('path');
const _           = require('lodash');

const config      = require('../src/config');
const cache       = require('../src/cache');
const logger      = require('../src/logger');
const utils       = require('../src/utils');
const errorhandler = require('../src/connect/errorhandler');
const db          = require('@igojs/db');

// colors
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red   = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim   = (s) => `\x1b[2m${s}\x1b[0m`;

// db verbs
const verbs   = {

  // igo db migrate
  migrate: async () => {
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
  migrations: async () => {

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
    if (args[2] && config.databases.indexOf(args[2]) < 0) {
      console.log('ERROR: Wrong database name');
      return;
    }

    const targets = args[2] ? [args[2]] : config.databases;
    const databaseNames = targets.map((name) => db.dbs[name].config.database);
    const confirmation  = databaseNames.join(',');

    console.log('WARNING: Database will be reset, data will be lost!');
    console.log(`Confirm the database name${targets.length > 1 ? 's (comma-separated)' : ''} (${confirmation}):`);

    await new Promise((resolve) => {
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      process.stdin.on('data', async (data) => {
        const input = data.toString().trim();
        if (input !== confirmation) {
          return resolve();
        }

        for (const name of targets) {
          const dbInstance = db.dbs[name];
          const database   = dbInstance.config.database;

          if (targets.length > 1) {
            console.log(`database: ${database}`);
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
        }

        // Cached entries reference the dropped data, so flush Redis after the reset
        await cache.init();
        await cache.flushdb();

        resolve();
      });
    });
  },

  // igo db reseed
  reseed: async (args) => {
    await verbs.reset(args);
    await verbs.seed(args);
  },

  // igo db seed
  seed: async () => {
    if (config.env === 'production') {
      console.error(red('Seeds cannot be run in production.'));
      return;
    }

    const seedsDir = path.resolve('seeds');
    if (!fs.existsSync(seedsDir)) {
      console.error(red('No seeds directory found.'));
      return;
    }

    const files = fs.readdirSync(seedsDir)
    .filter(f => f.match(/^\d+.*\.js$/))
    .sort();

    if (!files.length) {
      console.log(yellow('No seed files found.'));
      return;
    }

    await cache.init();
    for (const file of files) {
      const seed = require(path.join(seedsDir, file));
      await seed();
      console.log(`  ${green('✔')} ${file}`);
    }
  },

};

// igo db
module.exports = async (argv) => {

  const args = argv._;

  config.init();

  // Initialize @igojs/db with injected dependencies
  db.init({
    config,
    cache,
    logger,
    utils,
    errorhandler,
  });

  await db.dbs.init();

  if (args.length > 1 && verbs[args[1]]) {
    await verbs[args[1]](args);
    console.log(green('Done.'));
    process.exit(0);
  } else {
    console.error(red('ERROR: Wrong options'));
    console.error(dim('Usage: igo db [migrate|migrations|reset|seed|reseed]'));
  }
};
