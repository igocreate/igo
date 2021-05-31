
const _       = require('lodash');
const async   = require('async');

const fs      = require('fs');
const path    = require('path');
const util    = require('util');

const config  = require('../config');
const logger  = require('../logger');
const plugins = require('../plugins');

let db;

module.exports.init = function(_db) {
  db = _db;

  if (!config.auto_migrate) {
    return ;
  }

  db.getConnection((err, connection) => {
    if (err) {
      return console.error(err);
    }
    const lock = config[config.database].database + '.__db_migrations';
    db.query(connection, `SELECT GET_LOCK('${lock}', 0) AS 'lock'`, function(err, res) {
      if (!res || !res[0] || res[0].lock < 1) {
        // could not get lock, skip migration
        return db.release(connection);
      }
      // got lock, migrate!
      module.exports.migrate(() => {
        db.query(connection, `SELECT RELEASE_LOCK('${lock}')`, () => {
          db.release(connection);
        });
      });
    });
  });
};

//
module.exports.initmigrations = function(callback) {
  const sql = db.database.dialect.createMigrationsTable;
  db.query(sql, callback);
};

//
module.exports.list = function(callback) {
  module.exports.initmigrations(() => {
    var sql = db.database.dialect.listMigrations;
    db.query(sql, callback);
  });
};

//
module.exports.migrate = function(sqldir, callback) {
  if (_.isFunction(sqldir)) {
    callback = sqldir;
    sqldir = null;
  }
  sqldir          = sqldir || './sql';
  let querybuf  = '';

  const executeLine = function(line, callback) {
    line = line.replace('\r', '').trim();
    if (line.match('^--')) {
      callback();
    } else if (line.match('\\;$')) {
      querybuf += line;
      if (config.mysql.debugsql) {
        logger.info(querybuf);
      }
      db.query(querybuf, callback);
      querybuf = '';
    } else if (line.length > 0) {
      querybuf += line;
      callback();
    } else {
      callback();
    }
  };


  const executeFile = function(file, callback) {
    if (!file.filename.match('[0-9]{8}.*\\.sql$')) {
      return callback();
    }
    return async.waterfall([
      function(callback) {
        const sql = db.database.dialect.findMigration;
        return db.query(sql, [file.filename], function(err, result) {
          if (result && result.length > 0) {
            return callback('alreadyplayed');
          } else {
            return callback();
          }
        });
      }, function(callback) {
        return fs.readFile(file.path, function(err, data) {
          if (err || !data) {
            logger.error(err);
            return callback('could not read ' + file.path);
          }
          return callback(null, data);
        });
      }, function(data, callback) {
        var lines = data.toString().split('\n');
        if (config.mysql.debugsql) {
          logger.info('Executing ' + file.path + ': ' + lines.length + ' lines to process');
        }
        async.eachSeries(lines, executeLine, function(err) {
          if (err) {
            logger.error('SQL error in file %s', file.path);
          }
          const sql = db.database.dialect.insertMigration;
          var success = err ? 0 : 1;
          logger.info((success ? '✅ ' : '❌ ') + file.filename);
          err = err ? String(err) : null;
          db.query(sql, [file.filename, success, err, new Date()], () => {
            callback(err);
          });

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
  let files = [];
  fs.readdir(sqldir, function(err, filenames) {
    if (err) {
      return callback(err);
    }
    filenames.forEach(function(filename) {
      files.push({
        filename: filename,
        path:     path.join(sqldir, filename)
      });
    });

    // Load Plugins migrations
    async.each(plugins.list, function(plugin, callback) {
      fs.readdir(plugin.dirname + '/sql', function(err, filenames) {
        filenames.forEach(function(filename) {
          files.push();
          files.push({
            filename: filename,
            path:     path.join(plugin.dirname, '/sql', filename)
          });
        });
        callback();
      });
    }, () => {
      // execute migrations
      files = _.sortBy(files, 'filename');
      module.exports.initmigrations(() => {
        async.eachSeries(files, executeFile, callback);
      });
    });
  });
};
