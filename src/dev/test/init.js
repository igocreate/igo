
process.env.NODE_ENV = 'test';

const dbs         = require('../../db/dbs');
const migrations  = require('../../db/migrations');
const cache       = require('../../cache');
const config      = require('../../config');
const logger      = require('../../logger');
const cls         = require('../../cls');
const app         = require('../../app');

let context = null;

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
      migrations.migrate(db, './sql', (err) => {
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
before(function(done) {
  app.configure();
  // reinit main database
  reinitDatabase(dbs.main, done);
});

// begin transaction before each test
beforeEach(function(done) {
  const db = dbs.main;
  cls.getNamespace().run(() => {
    this.currentTest.fn = cls.bind(this.currentTest.fn);
    context = cls.getNamespace().active;
    cache.flushall(() => {
      db.beginTransaction(done);
    });
  });
});

// rollback transaction after each test
afterEach(function(done) {
  const db = dbs.main;
  // cls hack: restore context manually
  cls.getNamespace().active = context;
  db.rollbackTransaction(done);
});
