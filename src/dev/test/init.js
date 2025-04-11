
process.env.NODE_ENV = 'test';

const dbs         = require('../../db/dbs');
const migrations  = require('../../db/migrations');
const cache       = require('../../cache');
const config      = require('../../config');
const logger      = require('../../logger');
const app         = require('../../app');

//
const reinitDatabase = async (db) => {
  
  if (config.skip_reinit_db) {
    return;
  }
  
  const { dialect }   = db.driver;
  const database      = db.config.database;
  db.config.database  = null;
  db.init();

  const DROP_DATABASE   = dialect.dropDb(database);
  const CREATE_DATABASE = dialect.createDb(database);

  await db.query(DROP_DATABASE);
  await db.query(CREATE_DATABASE);
  db.config.database = database;
  db.init();

  try {
    await migrations.migrate(db, config.projectRoot);
    logger.info('✅ Reinitialized test database');
  } catch (err) {
    logger.error('❌ Failed to migrate database:', err);
  }
};

// before running tests
before( async () => {
  app.configure();
  // reinit databases
  for (const database of config.databases) {
    const db = dbs[database];
    if (db.config.noMigrations) {
      continue;
    }
    await reinitDatabase(db);
  }
});

// begin transaction before each test
beforeEach(async () => {
  await cache.flushall();

  for (const database of config.databases) {
    const db = dbs[database];
    if (db.config.noMigrations) {
      continue;
    }
    await db.beginTransaction();
  }
});

// rollback transaction after each test
afterEach(async() => {
  for (const database of config.databases) {
    const db = dbs[database];
    if (db.config.noMigrations) {
      continue;
    }
    await db.rollbackTransaction();
  }
});
