'use strict';

var mysql   = require('mysql');
var fs      = require('fs');
var util    = require('util');
var async   = require('async');
var winston = require('winston');
var _       = require('lodash');

var cls     = require('../cls');
var config  = require('../config');

var pool    = null;

module.exports.init = function() {
  pool    = mysql.createPool(config.mysql);
};

//
var getConnection = function(callback) {
  // if connection is in local storage
  var connection   = cls.getNamespace().get('connection');
  if (connection) {
    return callback(null, connection, true);
  }
  pool.getConnection(cls.bind(callback));
};

//
module.exports.query = function(sql, params, options, callback) {
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
    module.exports.init();
    if (!pool) {
      winston.error('could not create db connection pool');
      callback('dberror: could not create db connection pool');
    } else {
      runquery();
    }
  }
};

//
module.exports.queryOne = function(sql, params, options, callback) {
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
  return module.exports.query(sql, params, function(err, results) {
    if (results && results.length > 0 && callback) {
      return callback(null, results[0]);
    } else if (callback) {
      return callback(err, null);
    }
  });
};

//
module.exports.beginTransaction = function(callback) {
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
module.exports.commitTransaction = function(callback) {
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
module.exports.rollbackTransaction = function(callback) {
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


//
module.exports.initmigrations = function(callback) {
  var create = 'CREATE TABLE IF NOT EXISTS `__db_migrations` (' + '`id` INTEGER NOT NULL AUTO_INCREMENT, ' + '`file` VARCHAR(100), ' + '`success` TINYINT(1), ' + '`err` VARCHAR(255), ' + '`creation` DATETIME, ' + 'PRIMARY KEY (`id`) ' + ') ENGINE=InnoDB DEFAULT CHARSET=utf8';
  module.exports.query(create, callback);
};

//
module.exports.migrations = function(callback) {
  module.exports.initmigrations(function() {
    var sql = 'SELECT * FROM `__db_migrations` ORDER BY `id` DESC';
    module.exports.query(sql, callback);
  });
};

//
module.exports.migrate = function(callback) {
  var executeFile, executeLine, path, querybuf;
  path = './sql';
  querybuf = '';
  executeLine = function(line, callback) {
    line = line.replace('\r', '');
    line.trim();
    if (line.match('^--')) {
      callback();
    } else if (line.match('\\;$')) {
      querybuf += line;
      if (config.mysql.debugsql) {
        winston.info(querybuf);
      }
      module.exports.query(querybuf, callback);
      querybuf = '';
    } else if (line.length > 0) {
      querybuf += line;
      callback();
    } else {
      callback();
    }
  };
  executeFile = function(file, callback) {
    if (!file.match('[0-9]{8}.*\\.sql$')) {
      return callback();
    }
    return async.waterfall([
      function(callback) {
        var sql;
        sql = 'SELECT id from  `__db_migrations` WHERE `file`=? AND `success`=1';
        return module.exports.queryOne(sql, [file], function(err, result) {
          if (result) {
            return callback('alreadyplayed');
          } else {
            return callback();
          }
        });
      }, function(callback) {
        return fs.readFile(path + '/' + file, function(err, data) {
          if (err || !data) {
            winston.error(err);
            return callback('could not read ' + file);
          }
          return callback(null, data);
        });
      }, function(data, callback) {
        var lines = data.toString().split('\n');
        if (config.mysql.debugsql) {
          winston.info('Executing ' + file + ': ' + lines.length + ' lines to process');
        }
        async.eachSeries(lines, executeLine, function(err) {
          if (err) {
            winston.error('SQL error in file %s', file);
          }
          var sql = 'INSERT INTO `__db_migrations`(file, success, err, creation) ' + 'VALUES(?, ?, ?, ?)';
          var success = err ? 0 : 1;
          err = err ? util.format('%s', err) : null;
          module.exports.query(sql, [file, success, err, new Date()]);
          callback(err);
        });
      }
    ], function(err, result) {
      if (err === 'alreadyplayed') {
        err = null;
      }
      callback(err, result);
    });
  };

  //
  fs.readdir(path, function(err, files) {
    if (err) {
      return callback(err);
    }
    files.sort();
    module.exports.initmigrations(function() {
      async.eachSeries(files, executeFile, callback);
    });
  });
};
