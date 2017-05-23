

'use strict'

const _           = require('lodash');
const config      = require('../src/config');
const db          = require('../src/db/db');

const plugins     = require('../src/plugins');

// db verbs
const verbs   = {

  // igo db migrate
  migrate: function(args, callback) {
    config.mysql.debugsql = false;
    db.migrate(callback);
  },

  // igo db migrations
  migrations: function(args, callback) {
    config.mysql.debugsql = false;
    db.migrations(function(err, migrations) {
      migrations = _.reverse(migrations);
      _.each(migrations, function(migration) {
        console.log([
          migration.id,
          (migration.success ? 'OK' : 'KO'),
          migration.file,
          migration.err,
        ].join('  '));
      });
      callback(err);
    });
  },

  // igo db reset
  reset: function(args, callback) {
    const stdin     = process.openStdin();
    const database  = config.mysql.database;

    console.log('WARNING: Database will be reset, data will be lost!');
    console.log('Confirm the database name (' + config.mysql.database + '):');
    stdin.addListener('data', function(d) {
      d = d.toString().trim();
      if (d !== database) {
        return callback('Cancelled.');
      }

      const DROP_DATABASE   = 'DROP DATABASE IF EXISTS `' + database + '`;';
      const CREATE_DATABASE = 'CREATE DATABASE `' + database + '`;';

      config.mysql.debugsql = false;
      config.mysql.database = null;
      db.init();
      db.query(DROP_DATABASE, function() {
        db.query(CREATE_DATABASE, function() {
          config.mysql.database = database;
          db.init();
          db.migrate(function() {
            callback();
          });
        });
      });
    });
  }

};

// igo db
module.exports = function(argv) {
  var args = argv._;
  config.init();
  db.init();
  plugins.init();

  if (args.length > 1 && verbs[args[1]]) {
    verbs[args[1]](args, function(err) {
      console.log(err || 'Done.');
      process.exit(0);
    });
  } else {
    console.error('ERROR: Wrong options');
    console.error('Usage: igo db [migrate|reset]')
  }


};
