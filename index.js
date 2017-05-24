
'use strict';

const igo = {
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
  Admin:    require('./src/admin/Admin'),
  app:      require('./src/app')
};

// dev
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'dev') {
  igo.dev = require('./src/dev/index');
}

module.exports = igo;
