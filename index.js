
'use strict';

const igo = module.exports = {
  cache:    require('./src/cache'),
  cls:      require('./src/cls'),
  config:   require('./src/config'),
  db:       require('./src/db/db'),
  express:  require('express'),
  i18next:  require('i18next'),
  render:   require('consolidate').dust,
  logger:   require('winston'),
  mailer:   require('./src/mailer'),
  Model:    require('./src/db/Model'),
  Admin:    require('./src/admin/Admin')
};

// load app + plugins
igo.app     = require('./src/app');
igo.plugins = require('./src/plugins');

// dev
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'dev') {
  igo.dev = require('./src/dev/index');
}
