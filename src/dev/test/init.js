
process.env.NODE_ENV = 'test';

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
      migrations.migrate(db, config.projectRoot + '/sql', (err) => {
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
  // reinit main database
  reinitDatabase(dbs.main, done);
});

// begin transaction before each test
beforeEach((done) => {
  const db = dbs.main;
  cache.flushall().then(() => {
    db.beginTransaction(done);
  });
});

// rollback transaction after each test
afterEach((done) => {
  const db = dbs.main;
  db.rollbackTransaction(done);
});
