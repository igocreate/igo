
const _                     = require('lodash');
const { AsyncLocalStorage } = require('async_hooks');

const dependencies          = require('./dependencies');
const QueryCache            = require('./QueryCache');

// Dynamic driver loading
const loadedDrivers = {};
const getDriver = (driverName) => {
  loadedDrivers[driverName] = loadedDrivers[driverName] || require(`./drivers/${driverName}`);
  return loadedDrivers[driverName];
};

//
const logQuery = (sql, params) => {
  const { logger } = dependencies;
  logger.info('Db.query: ' + sql);
  if (params?.length) {
    logger.info('With params: ' + params);
  }
};


// a savepoint outliving its parent would run on a connection already back in the pool
const isOpen = (transaction) => !transaction.finished && (!transaction.parent || isOpen(transaction.parent));

//
class Db {

  constructor(name) {
    const { config } = dependencies;
    this.name         = name;
    this.config       = config[name];
    if (!this.config) {
      throw new Error(`No database configuration found for '${name}'. Add config.${name} = { driver, host, … } in your config.`);
    }
    this.driver       = getDriver(this.config.driver);
    this.connection   = null;
    this.closed       = false;
    this.transactions = new AsyncLocalStorage();
    this.savepoints   = 0;
    this.config.migrations_dir = `sql/${this.name}`;
  }

  async init() {
    const { config } = dependencies;
    this.pool              = await this.driver.createPool(this.config);
    this.connection        = null;
    this.testQueue         = Promise.resolve();
    this.closed            = false;
    this.TEST_ENV          = config.env === 'test';
    this.inTestTransaction = false;
  }

  async close() {
    if (this.closed) {
      return;
    }
    this.closed     = true;
    const { pool, connection } = this;
    this.pool       = null;
    this.connection = null;
    // a connection kept across queries is still checked out, and
    // the pool would wait for it to come back before ending
    if (connection) {
      this.driver.release(connection);
    }
    if (pool) {
      await this.driver.closePool(pool);
    }
  }

  //
  async getConnection() {
    const { driver, pool, TEST_ENV } = this;
    if (this.closed) {
      throw new Error(`Db '${this.name}' is closed: the application is shutting down.`);
    }
    const transaction = this.currentTransaction();
    if (transaction) {
      return { connection: transaction.connection, keep: true };
    }
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
    const { logger } = dependencies;
    const { driver, config } = this;
    const { dialect } = driver;

    const runquery = async() => {

      const { connection, keep } = await this.getConnection();

      try {

        const result = await this.driver.query(connection, sql, params, options);
        if (config.debugsql) {
          logQuery(sql, params);
        }
        return dialect.getRows(result);

      } catch (err) {
        if (options.silent) {
          return null;
        }
        // logged once, by whoever lets it through: the statement goes with it
        err.statement = { sql, params };
        throw err;
      } finally {
        if (!keep) {
          // console.log('query: release transaction');
          driver.release(connection);
          if (this.TEST_ENV) {
            this.connection = null;
          }
        }
      }
    };

    if (this.closed) {
      throw new Error(`Db '${this.name}' is closed: the application is shutting down.`);
    }

    if (!this.pool) {
      logger.info('Db.query: Trying to reinitialize db connection pool');
      await this.init();
      if (!this.pool) {
        throw new Error('Db.query: could not create db connection pool');
      }
    }

    // test mode shares a single connection: queries must not overlap on it
    if (this.TEST_ENV) {
      const previousQuery = this.testQueue;
      const currentQuery  = previousQuery.catch(() => {}).then(runquery);
      this.testQueue = currentQuery;
      return await currentQuery;
    }
    return await runquery();
  }

  currentTransaction() {
    const transaction = this.transactions.getStore();
    return transaction && isOpen(transaction) ? transaction : null;
  }

  // every query started inside fn, however indirectly, runs in the transaction;
  // one that starts once fn has settled goes back to the pool
  async transaction(fn) {
    const parent = this.currentTransaction();
    if (!this._opensSavepoint(parent)) {
      return await this._transact(fn);
    }
    // savepoints set side by side on one connection would release or roll back each other
    const siblings = parent || this;
    const turn     = (siblings.savepointQueue || Promise.resolve()).catch(() => {}).then(() => this._transact(fn));
    siblings.savepointQueue = turn;
    return await turn;
  }

  _opensSavepoint(parent) {
    return !!parent || (this.TEST_ENV && this.inTestTransaction);
  }

  async _transact(fn) {
    const transaction = await this._begin();
    let result;
    try {
      result = await this.transactions.run(transaction, fn);
      transaction.finished = true;
      await this._commit(transaction);
    } catch (err) {
      transaction.finished = true;
      await this._rollback(transaction);
      throw err;
    } finally {
      this._release(transaction);
    }
    await this._afterCommit(transaction);
    return result;
  }

  async _begin() {
    const parent      = this.currentTransaction();
    const transaction = { parent, tables: new Set(), finished: false };

    // the test connection is already inside a transaction
    if (this._opensSavepoint(parent)) {
      transaction.savepoint  = `igo_sp_${++this.savepoints}`;
      transaction.connection = parent ? parent.connection : this.connection;
      await this._queryIn(parent, `SAVEPOINT ${transaction.savepoint}`);
      return transaction;
    }

    if (this.closed) {
      throw new Error(`Db '${this.name}' is closed: the application is shutting down.`);
    }
    transaction.connection = await this.driver.getConnection(this.pool);
    try {
      await this.driver.beginTransaction(transaction.connection);
    } catch (err) {
      this.driver.destroy(transaction.connection);
      throw err;
    }
    return transaction;
  }

  async _commit({ parent, savepoint, connection }) {
    if (savepoint) {
      await this._queryIn(parent, `RELEASE SAVEPOINT ${savepoint}`);
    } else {
      await this.driver.commit(connection);
    }
  }

  async _rollback(transaction) {
    const { parent, savepoint, connection } = transaction;
    try {
      if (savepoint) {
        await this._queryIn(parent, `ROLLBACK TO SAVEPOINT ${savepoint}`);
      } else {
        await this.driver.rollback(connection);
      }
    } catch (err) {
      transaction.broken = true;
      dependencies.logger.error(`Db.transaction: rollback failed: ${err.message}`);
    }
  }

  _release({ savepoint, connection, broken }) {
    if (savepoint) {
      return;
    }
    // back in the pool, a connection stuck in a transaction would hand it to the next caller
    if (broken) {
      this.driver.destroy(connection);
    } else {
      this.driver.release(connection);
    }
  }

  async _afterCommit({ parent, tables }) {
    if (parent) {
      tables.forEach(table => parent.tables.add(table));
      return;
    }
    // the data is committed: a cache that cannot be invalidated must not turn it into a failure
    try {
      await Promise.all([...tables].map(QueryCache.bump));
    } catch (err) {
      dependencies.logger.error(`Db.transaction: cache invalidation failed after commit: ${err.message}`);
    }
  }

  _queryIn(transaction, sql) {
    return this.transactions.run(transaction, () => this.query(sql));
  }

  // used by @igojs/server to isolate each test
  async _beginTestTransaction() {
    const { driver } = this;
    const { connection } = await this.getConnection();
    await driver.beginTransaction(connection);
    this.inTestTransaction = true;
    // a transaction left pending by a timed-out test must not hold back the next ones
    this.savepointQueue    = null;
  }

  async _rollbackTestTransaction() {
    const { driver, TEST_ENV } = this;

    // No connection = no transaction to rollback
    if (TEST_ENV && !this.connection) {
      return;
    }

    const { connection } = await this.getConnection();
    await driver.rollback(connection);
    driver.release(connection);
    this.inTestTransaction = false;
    if (TEST_ENV) {
      this.connection = null;
    }
  }
}

module.exports = Db;
