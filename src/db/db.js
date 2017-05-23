'use strict';

var mysql         = require('mysql');
var util          = require('util');
var async         = require('async');
var winston       = require('winston');
var _             = require('lodash');

var cls           = require('../cls');
var config        = require('../config');

var pool          = null;

//
const migrations = require('./migrations');

const db = module.exports = {};

//
db.init = function() {
  pool = mysql.createPool(config.mysql);
  migrations.init(db);
};

// migrations functions
db.migrations = migrations.list;
db.migrate    = migrations.migrate;


//
var getConnection = function(callback) {
  // if connection is in local storage
  var namespace   = cls.getNamespace();
  var connection  = namespace && namespace.get('connection');
  if (connection) {
    return callback(null, connection, true);
  }
  pool.getConnection(cls.bind(callback));
};

//
db.query = function(sql, params, options, callback) {
  var runquery;

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

  runquery = function() {
    getConnection(function(err, connection, keep) {
      if (err) {
        console.log(err);
        winston.error(err);
        return callback(err);
      }
      connection.query(sql, params, cls.bind(function(err, rows) {

        if (config.mysql.debugsql || (err && !options.silent)) {
          winston.info('Db.query: ' + sql);
          if (params && params.length > 0) {
            winston.info('With params: ' + params);
          }
          if (err && !options.silent) {
            console.log(err);
            winston.error(err);
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
    winston.info('Db.query: Trying to reinitialize db connection pool');
    db.init();
    if (!pool) {
      winston.error('could not create db connection pool');
      callback('dberror: could not create db connection pool');
    } else {
      runquery();
    }
  }
};

//
db.queryOne = function(sql, params, options, callback) {
  // console.log('db.queryOne will be deprecated.');
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
  return db.query(sql, params, function(err, results) {
    if (results && results.length > 0 && callback) {
      return callback(null, results[0]);
    } else if (callback) {
      return callback(err, null);
    }
  });
};

//
db.beginTransaction = function(callback) {
  getConnection(function(err, connection) {
    if (err) {
      winston.error(err);
      return callback(err, connection);
    }
    connection.beginTransaction(cls.bind(function(err) {
      if (err) {
        winston.error(err);
      } else {
        cls.getNamespace().set('connection', connection);
      }
      callback(err, connection);
    }));
  });
};

//
db.commitTransaction = function(callback) {
  getConnection(function(err, connection) {
    if (err) {
      winston.error(err);
      return callback(err, connection);
    }
    connection.commit(cls.bind(function(err) {
      if (err) {
        winston.error(err);
      } else {
        connection.release();
        cls.getNamespace().set('connection', null);
      }
      callback(err);
    }));
  });
};

//
db.rollbackTransaction = function(callback) {
  getConnection(function(err, connection) {
    if (err) {
      winston.error(err);
      return callback(err, connection);
    }
    connection.rollback(cls.bind(function(err) {
      if (err) {
        winston.error(err);
      } else {
        connection.release();
        cls.getNamespace().set('connection', null);
      }
      callback(err);
    }));
  });
};
