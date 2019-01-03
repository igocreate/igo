
process.env.NODE_ENV = 'test';

const db          = require('../../db/db');
const migrations  = require('../../db/migrations');
const cache       = require('../../cache');
const config      = require('../../config');
const logger      = require('../../logger');
const cls         = require('../../cls');
const app         = require('../../app');
const plugins     = require('../../plugins');

var context;

//
var reinitDatabase = function(callback) {
  const database = config.mysql.database;
  config.mysql.database = null;
  db.init();

  var DROP_DATABASE   = 'DROP DATABASE IF EXISTS `' + database + '`;';
  var CREATE_DATABASE = 'CREATE DATABASE `' + database + '`;';

  db.query(DROP_DATABASE, function() {
    db.query(CREATE_DATABASE, function() {
      config.mysql.database = database;
      db.init(config);
      migrations.migrate(function() {
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
