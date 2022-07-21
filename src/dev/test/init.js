
process.env.NODE_ENV = 'test';

const async       = require('async');
const dbs         = require('../../db/dbs');
const migrations  = require('../../db/migrations');
const cache       = require('../../cache');
const config      = require('../../config');
const logger      = require('../../logger');
const app         = require('../../app');

//
const reinitDatabase = (db, callback) => {
  
  if (config.skip_reinit_db) {
    return callback();
  }
  
  const { dialect }   = db.driver;
  const database      = db.config.database;
  db.config.database  = null;
  db.init();

  const DROP_DATABASE   = dialect.dropDb(database);
  const CREATE_DATABASE = dialect.createDb(database);

  // console.log(DROP_DATABASE);
  db.query(DROP_DATABASE, () => {
    db.query(CREATE_DATABASE, () => {
      db.config.database = database;
      db.init();
      migrations.migrate(db, config.projectRoot, (err) => {
        if (err) {
          return callback('Database migration error : ' + err);
        }
        logger.info('Igo dev: reinitialized test database');
        callback();
      });
    });
  });
};

// before running tests
before((done) => {
  app.configure();
  // reinit databases
  async.eachSeries(config.databases, (database, callback) => {
    const db = dbs[database];
    reinitDatabase(db, callback);
  }, done);
});

// begin transaction before each test
beforeEach((done) => {
  cache.flushall().then(() => {
    async.eachSeries(config.databases, (database, callback) => {
      const db = dbs[database];
      db.beginTransaction(callback);
    }, done);
  });
});

// rollback transaction after each test
afterEach((done) => {
  async.eachSeries(config.databases, (database, callback) => {
    const db = dbs[database];
    db.rollbackTransaction(callback);
  }, done);
});
