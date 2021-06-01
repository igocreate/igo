
process.env.NODE_ENV = 'test';

const db          = require('../../db/db');
const migrations  = require('../../db/migrations');
const cache       = require('../../cache');
const config      = require('../../config');
const logger      = require('../../logger');
const cls         = require('../../cls');
const app         = require('../../app');
const plugins     = require('../../plugins');

let context = null;

//
const reinitDatabase = (callback) => {
  const database  = config[config.database].database;
  config[config.database].database = null;
  db.init();
  const { dialect } = db.database;
  const sqldir = config.database === 'postgresql' ? './postgresql' : './sql';

  const DROP_DATABASE   = dialect.dropDb(database);
  const CREATE_DATABASE = dialect.createDb(database);

  // console.log(DROP_DATABASE);
  db.query(DROP_DATABASE, function() {
    db.query(CREATE_DATABASE, function() {
      config[config.database].database = database;
      db.init();
      migrations.migrate(sqldir, function() {
        logger.info('Igo dev: reinitialized test database');
        callback();
      });
    });
  });
};

// before running tests
before(function(done) {
  app.configure();
  if (config.skip_reinit_db) {
    return done();
  }
  reinitDatabase(done);
});

// begin transaction before each test
beforeEach(function(done) {
  const _this = this;
  cls.getNamespace().run(function() {
    _this.currentTest.fn = cls.bind(_this.currentTest.fn);
    context = cls.getNamespace().active;
    cache.flushall(function() {
      db.beginTransaction(function() {
        if (config.test && config.test.beforeEach) {
          return config.test.beforeEach(done);
        }
        done();
      });
    })
  });
});

// rollback transaction after each test
afterEach(function(done) {
  // cls hack: restore context manually
  cls.getNamespace().active = context;
  db.rollbackTransaction(function() {
    if (config.test && config.test.afterEach) {
      return config.test.afterEach(done);
    }
    done();
  });

});
