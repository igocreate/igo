
const db            = require('@igojs/db');
const config        = require('./src/config');
const cache         = require('./src/cache');
const logger        = require('./src/logger');
const utils         = require('./src/utils');
const errorhandler  = require('./src/connect/errorhandler');

const server = {
  app:              require('./src/app'),
  cache,
  CacheStats:       db.CacheStats,
  config,
  dev:              require('./src/dev/index'),
  dbs:              db.dbs,
  express:          require('express'),
  i18next:          require('i18next'),
  dust:             require('@igojs/dust'),
  logger,
  mailer:           require('./src/mailer'),
  migrations:       db.migrations,
  Model:            db.Model,
  Form:             require('./src/forms/Form'),
  // New utilities
  gracefulShutdown: require('./src/graceful-shutdown'),
  health:           require('./src/connect/health'),
  requestId:        require('./src/connect/request-id'),
};

module.exports = server;
