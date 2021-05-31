const _             = require('lodash');

const cls           = require('../cls');
const config        = require('../config');
const logger        = require('../logger');

const errorhandler  = require('../connect/errorhandler');
//
const migrations = require('./migrations');

const DATABASES = {
  mysql:      require('./databases/mysql'),
  postgresql: require('./databases/postgresql'),
};

let database      = null;
let pool          = null;


//
module.exports.init = () => {
  database  = DATABASES[config.database];
  pool      = database.createPool();
  migrations.init(module.exports);
  module.exports.database = database;
};

// migrations functions
module.exports.migrations = migrations.list;
module.exports.migrate    = migrations.migrate;

//
module.exports.getConnection = (callback) => {
  // if connection is in local storage
  const namespace   = cls.getNamespace();
  const connection  = namespace && namespace.get('connection');
  if (connection) {
    return callback(null, connection, true);
  }
  database.getConnection(pool, cls.bind(callback));
};

//
module.exports.query = (sql, params, options, callback) => {

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
    module.exports.getConnection((err, connection, keep) => {
      if (err) {
        console.log(err);
        logger.error(err);
        return callback(err);
      }

      database.query(connection, sql, params, cls.bind(function(err, rows) {
        if (config[config.database].debugsql || (err && !options.silent)) {
          logger.info('Db.query: ' + sql);
          if (params && params.length > 0) {
            logger.info('With params: ' + params);
          }
          if (err && !options.silent) {
            errorhandler.errorSQL(err);
          }
        }
        if (callback) {
          callback(err, rows);
        }
        if (!keep) {
          database.release(connection);
        }
      }));
    });
  };

  if (pool) {
    runquery();
  } else {
    logger.info('Db.query: Trying to reinitialize db connection pool');
    module.exports.init();
    if (!pool) {
      logger.error('could not create db connection pool');
      callback('dberror: could not create db connection pool');
    } else {
      runquery();
    }
  }
};

//
module.exports.beginTransaction = function(callback) {
  module.exports.getConnection((err, connection) => {
    if (err) {
      logger.error(err);
      return callback(err, connection);
    }
    database.beginTransaction(connection, cls.bind((err) => {
      if (err) {
        logger.error(err);
      } else {
        cls.getNamespace().set('connection', connection);
      }
      callback(err, connection);
    }));
  });
};

//
module.exports.commitTransaction = function(callback) {
  module.exports.getConnection((err, connection) => {
    if (err) {
      logger.error(err);
      return callback(err, connection);
    }
    database.commit(connection, cls.bind((err) => {
      if (err) {
        logger.error(err);
      } else {
        database.release(connection);
        cls.getNamespace().set('connection', null);
      }
      callback(err);
    }));
  });
};

//
module.exports.rollbackTransaction = function(callback) {
  module.exports.getConnection((err, connection) => {
    if (err) {
      logger.error(err);
      return callback(err, connection);
    }
    database.rollback(connection, cls.bind((err) => {
      if (err) {
        logger.error(err);
      } else {
        database.release(connection);
        cls.getNamespace().set('connection', null);
      }
      callback(err);
    }));
  });
};
