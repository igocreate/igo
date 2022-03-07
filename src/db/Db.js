
const _             = require('lodash');

const config        = require('../config');
const logger        = require('../logger');

const errorhandler  = require('../connect/errorhandler');

//
const DRIVERS = {
  mysql:      require('./drivers/mysql'),
  postgresql: require('./drivers/postgresql'),
};

//
class Db {

  constructor(name) {
    this.name       = name;
    this.config     = config[name];
    this.driver     = DRIVERS[this.config.driver];
    this.connection = null;
  }

  init() {
    this.pool       = this.driver.createPool(this.config);
    this.connection = null;
    this.TEST_ENV   = config.env === 'test';
  }

  //
  getConnection(callback) {
    const { driver, pool, TEST_ENV } = this;
    // if connection is in local storage
    if (TEST_ENV && this.connection) {
      // console.log('keep same connection');
      return callback(null, this.connection, true);
    }
    // console.log('create new connection');
    driver.getConnection(pool, (err, connection) => {
      if (TEST_ENV) {
        this.connection = connection;
      }
      callback(err, connection);
    });
  }

  //
  query(sql, params, options, callback) {

    const { driver, config, TEST_ENV } = this;
    const { dialect } = driver;

    params  = params  || [];
    options = options || {};
    if (_.isFunction(params)) {
      callback  = params;
      params    = [];
      options   = {};
    }
    if (_.isFunction(options)) {
      callback  = options;
      options   = {};
    }

    const runquery = () => {

      this.getConnection((err, connection, keep) => {
        if (err) {
          console.log(err);
          logger.error(err);
          return callback(err);
        }

        // console.log(this.name + ': ' + sql);
        // console.dir(params);
        driver.query(connection, sql, params, (err, result) => {
          // console.dir(result);
          if (config.debugsql || (err && !options.silent)) {
            logger.info('Db.query: ' + sql);
            if (params && params.length > 0) {
              logger.info('With params: ' + params);
            }
            if (err && !options.silent) {
              errorhandler.errorSQL(err);
            }
          }
          if (callback) {
            callback(err, dialect.getRows(result));
          }
          if (!keep) {
            // console.log('query: release transaction');
            driver.release(connection);
            if (TEST_ENV) {
              this.connection = null;
            }
          }
        });
      });
    };

    if (this.pool) {
      return runquery();
    }

    logger.info('Db.query: Trying to reinitialize db connection pool');
    this.init();
    if (!this.pool) {
      logger.error('could not create db connection pool');
      callback('dberror: could not create db connection pool');
    } else {
      runquery();
    }
  }

  //
  beginTransaction(callback) {
    const { driver } = this;

    this.getConnection((err, connection) => {
      if (err) {
        logger.error(err);
        return callback(err, connection);
      }
      driver.beginTransaction(connection, (err) => {
        if (err) {
          logger.error(err);
        }
        callback(err, connection);
      });
    });
  }

  //
  commitTransaction(callback) {
    const { driver, TEST_ENV } = this;
    this.getConnection((err, connection) => {
      if (err) {
        logger.error(err);
        return callback(err, connection);
      }
      driver.commit(connection, (err) => {
        if (err) {
          logger.error(err);
        } else {
          driver.release(connection);
          if (TEST_ENV) {
            this.connection = null;
          }
        }
        callback(err);
      });
    });
  }

  //
  rollbackTransaction(callback) {
    const { driver, TEST_ENV } = this;

    this.getConnection((err, connection) => {
      if (err) {
        logger.error(err);
        return callback(err, connection);
      }
      driver.rollback(connection, (err) => {
        if (err) {
          logger.error(err);
        } else {
          driver.release(connection);
          if (TEST_ENV) {
            this.connection = null;
          }
        }
        callback(err);
      });
    });
  }

}

module.exports = Db;