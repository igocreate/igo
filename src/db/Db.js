
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
    this.config.migrations_dir = `sql/${this.name}`;
  }

  async init() {
    this.pool       = await this.driver.createPool(this.config);
    this.connection = null;
    this.TEST_ENV   = config.env === 'test';
  }

  //
  async getConnection() {
    const { driver, pool, TEST_ENV } = this;
    // if connection is in local storage
    if (TEST_ENV && this.connection) {
      // console.log('keep same connection');
      return { connection: this.connection, keep: true };
    }

    const connection = await driver.getConnection(pool);

    if (TEST_ENV) {
      this.connection = connection;
    }
    return { connection, keep: false };

  }

  //
  async query(sql, params=[], options={}) {

    const { driver, config, TEST_ENV } = this;
    const { dialect } = driver;

    const runquery = async() => {

      const { err, connection, keep } = await this.getConnection();
      const result = await this.driver.query(connection, sql, params, options);
      if (config.debugsql || (err && !options.silent)) {
        logger.info('Db.query: ' + sql);
        if (params && params.length > 0) {
          logger.info('With params: ' + params);
        }
        if (err && !options.silent) {
          errorhandler.errorSQL(err);
        }
      }
      const rows = dialect.getRows(result);
      if (!keep) {
        // console.log('query: release transaction');
        driver.release(connection);
        if (TEST_ENV) {
          this.connection = null;
        }
      }

      return rows;
    };

    if (this.pool) {
      return await runquery();
    }

    logger.info('Db.query: Trying to reinitialize db connection pool');
    await this.init();
    if (!this.pool) {
      logger.error('could not create db connection pool');
    } else {
      return await runquery();
    }
  }
  
  

  //
  async beginTransaction() {
    const { driver } = this;

    const { err, connection } = await this.getConnection();
    if (err) {
      logger.error(err);
      return;
    }
    await driver.beginTransaction(connection);
  }

  //
  async commitTransaction() {
    const { driver, TEST_ENV } = this;

    const { err, connection } = await this.getConnection();
    if (err) {
      logger.error(err);
      return;
    }
    await driver.commit(connection);
    driver.release(connection);
    if (TEST_ENV) {
      this.connection = null;
    }
  }

  //
  async rollbackTransaction() {
    const { driver, TEST_ENV } = this;

    const { err, connection } = await this.getConnection();
    if (err) {
      logger.error(err);
      return;
    }
    await driver.rollback(connection);
    driver.release(connection);
    if (TEST_ENV) {
      this.connection = null;
    }
  }
}

module.exports = Db;