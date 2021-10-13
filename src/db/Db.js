
const _             = require('lodash');

const cls           = require('../cls');
const config        = require('../config');
const logger        = require('../logger');

const errorhandler  = require('../connect/errorhandler');

//
const DRIVERS = {
  mysql:      require('./drivers/mysql'),
  postgresql: require('./drivers/postgresql'),
};


class Db {

  constructor(name) {
    this.name     = name;
    this.config   = config[name];
    this.driver   = DRIVERS[this.config.driver];
  }

  init() {
    this.pool = this.driver.createPool(this.config);
  }

  //
  getConnection(callback) {
    const { name, driver, pool } = this;
    // if connection is in local storage
    const namespace   = cls.getNamespace();
    const connection  = namespace && namespace.get(name);
    if (connection) {
      // console.log('keep same connection');
      return callback(null, connection, true);
    }
    // console.log('create new connection');
    driver.getConnection(pool, cls.bind(callback));
  }

  //
  query(sql, params, options, callback) {

    const { driver, config } = this;
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
        driver.query(connection, sql, params, cls.bind(function(err, result) {
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
            driver.release(connection);
          }
        }));
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
    const { name, driver } = this;

    this.getConnection((err, connection) => {
      if (err) {
        logger.error(err);
        return callback(err, connection);
      }
      driver.beginTransaction(connection, cls.bind((err) => {
        if (err) {
          logger.error(err);
        } else {
          cls.getNamespace().set(name, connection);
        }
        callback(err, connection);
      }));
    });
  }

  //
  commitTransaction(callback) {
    const { name, driver } = this;
    this.getConnection((err, connection) => {
      if (err) {
        logger.error(err);
        return callback(err, connection);
      }
      driver.commit(connection, cls.bind((err) => {
        if (err) {
          logger.error(err);
        } else {
          driver.release(connection);
          cls.getNamespace().set(name, null);
        }
        callback(err);
      }));
    });
  }

  //
  rollbackTransaction(callback) {
    const { name, driver } = this;

    this.getConnection((err, connection) => {
      if (err) {
        logger.error(err);
        return callback(err, connection);
      }
      driver.rollback(connection, cls.bind((err) => {
        if (err) {
          logger.error(err);
        } else {
          driver.release(connection);
          cls.getNamespace().set(name, null);
        }
        callback(err);
      }));
    });
  }

}

module.exports = Db;