'use strict';

process.env.NODE_ENV = 'test';

var db      = require('../db/db');
var cache   = require('../cache');
var config  = require('../config');

before(function(done) {

  config.init();

  var database = config.mysql.database;
  config.mysql.database = null;
  db.init(config.mysql);
  cache.init(config.redis);
  cache.flushall();

  var DROP_DATABASE   = 'DROP DATABASE IF EXISTS `' + database + '`;';
  var CREATE_DATABASE = 'CREATE DATABASE `' + database + '`;';

  db.query(DROP_DATABASE, function() {
    db.query(CREATE_DATABASE, function() {

      config.mysql.database = database;
      db.init(config.mysql);
      db.migrate(function() {
        console.log('test/Init: reinitialized database');
        done();
      });
    });
  });
});
