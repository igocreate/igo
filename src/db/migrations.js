
const _       = require('lodash');
const async   = require('async');

const fs      = require('fs');
const path    = require('path');

const config  = require('../config');
const plugins = require('../plugins');


//
module.exports.init = function(db) {

  if (!config.auto_migrate) {
    return ;
  }

  db.getConnection((err, connection) => {
    if (err) {
      return console.error(err);
    }
    const { dialect } = db.driver;
    const lock = db.config.database + '.__db_migrations';
    const getLock = dialect.getLock(lock);
    db.driver.query(connection, getLock, [], (err, res) => {
      if (!dialect.gotLock(res)) {
        // could not get lock, skip migration
        return db.driver.release(connection);
      }
      // got lock, migrate!
      module.exports.migrate(db, () => {
        const releaseLock = dialect.releaseLock(lock);
        setTimeout(() => {
          db.query(releaseLock, () => {
            db.driver.release(connection);
          });
        }, 10000);
      });
    });
  });
};

//
module.exports.initmigrations = function(db, callback) {
  const sql = db.driver.dialect.createMigrationsTable;
  db.query(sql, callback);
};

//
module.exports.list = function(db, callback) {
  module.exports.initmigrations(db, () => {
    var sql = db.driver.dialect.listMigrations;
    db.query(sql, callback);
  });
};

//
module.exports.migrate = function(db, rootDir, callback) {
  if (_.isFunction(rootDir)) {
    callback = rootDir;
    rootDir = '.';
  }

  if (db.config.noMigrations) {
    return callback();
  }

  const sqldir = `${rootDir}/${db.config.migrations_dir || 'sql'}`;
  let querybuf  = '';

  const executeLine = function(line, callback) {
    line = line.replace('\r', '').trim();
    if (line.match('^--')) {
      callback();
    } else if (line.match('\\;$')) {
      querybuf += line;
      if (config.mysql.debugsql) {
        console.info(querybuf);
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
        const sql = db.driver.dialect.findMigration;
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
            console.error(err);
            return callback('could not read ' + file.path);
          }
          return callback(null, data);
        });
      }, function(data, callback) {
        var lines = data.toString().split('\n');
        if (config.mysql.debugsql) {
          console.info('Executing ' + file.path + ': ' + lines.length + ' lines to process');
        }
        async.eachSeries(lines, executeLine, function(err) {
          if (err) {
            console.error('SQL error in file %s', file.path);
          }
          const sql = db.driver.dialect.insertMigration;
          var success = err ? 0 : 1;
          console.info((success ? '✅ ' : '❌ ') + file.filename);
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
      module.exports.initmigrations(db, () => {
        async.eachSeries(files, executeFile, callback);
      });
    });
  });
};
