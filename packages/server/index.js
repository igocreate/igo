
const db            = require('@igo/db');
const config        = require('./src/config');
const cache         = require('./src/cache');
const logger        = require('./src/logger');
const utils         = require('./src/utils');
const errorhandler  = require('./src/connect/errorhandler');

const server = {
  app:        require('./src/app'),
  cache,
  CacheStats: db.CacheStats,
  config,
  dev:        require('./src/dev/index'),
  dbs:        db.dbs,
  express:    require('express'),
  i18next:    require('i18next'),
  dust:       require('@igo/dust'),
  logger,
  mailer:     require('./src/mailer'),
  migrations: db.migrations,
  Model:      db.Model,
  Form:       require('./src/forms/Form'),
};

module.exports = server;
