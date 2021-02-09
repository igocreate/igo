const _             = require('lodash');
const mysql         = require('mysql');

const cls           = require('../cls');
const config        = require('../config');
const logger        = require('../logger');

const errorhandler  = require('../connect/errorhandler');
//
const migrations = require('./migrations');

let pool          = null;

//
module.exports.init = () => {
  pool = mysql.createPool(config.mysql);
  migrations.init(module.exports);
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
  pool.getConnection(cls.bind(callback));
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
    module.exports.getConnection(function(err, connection, keep) {
      if (err) {
        console.log(err);
        logger.error(err);
        return callback(err);
      }
      connection.query(sql, params, cls.bind(function(err, rows) {

        if (config.mysql.debugsql || (err && !options.silent)) {
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
          connection.release();
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
    connection.beginTransaction(cls.bind((err) => {
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
    connection.commit(cls.bind((err) => {
      if (err) {
        logger.error(err);
      } else {
        connection.release();
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
    connection.rollback(cls.bind((err) => {
      if (err) {
        logger.error(err);
      } else {
        connection.release();
        cls.getNamespace().set('connection', null);
      }
      callback(err);
    }));
  });
};
