

'use strict'

const config  = require('../src/config');
const db      = require('../src/db/db');

// db verbs
const verbs   = {

  // igo db migrate
  migrate: function(args, callback) {
    config.mysql.debugsql = false;
    db.migrate(callback);
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
