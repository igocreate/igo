
process.env.NODE_ENV = 'test';

const db          = require('@igo/db');
const cache       = require('../../cache');
const config      = require('../../config');
const logger      = require('../../logger');
const app         = require('../../app');

//
const reinitDatabase = async (dbInstance) => {

  if (config.skip_reinit_db) {
    return;
  }

  const { dialect }   = dbInstance.driver;
  const database      = dbInstance.config.database;
  dbInstance.config.database  = null;
  await dbInstance.init();

  const DROP_DATABASE   = dialect.dropDb(database);
  const CREATE_DATABASE = dialect.createDb(database);

  await dbInstance.query(DROP_DATABASE);
  await dbInstance.query(CREATE_DATABASE);
  dbInstance.config.database = database;
  await dbInstance.init();

  try {
    await db.migrations.migrate(dbInstance, config.projectRoot);
    logger.info('✅ Reinitialized test database');
  } catch (err) {
    logger.error('❌ Failed to migrate database:', err);
  }
};

// before running tests
before(async () => {
  await app.configure();
  // reinit databases
  for (const database of config.databases) {
    const dbInstance = db.dbs[database];
    if (dbInstance.config.noMigrations) {
      continue;
    }
    await reinitDatabase(dbInstance);
  }
});

// begin transaction before each test
beforeEach(async () => {
  await cache.flushall();

  for (const database of config.databases) {
    const dbInstance = db.dbs[database];
    if (dbInstance.config.noMigrations) {
      continue;
    }
    await dbInstance.beginTransaction();
  }
});

// rollback transaction after each test
afterEach(async() => {
  for (const database of config.databases) {
    const dbInstance = db.dbs[database];
    if (dbInstance.config.noMigrations) {
      continue;
    }
    await dbInstance.rollbackTransaction();
  }
});
