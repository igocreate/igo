
const igo = {
  cache:    require('./src/cache'),
  cls:      require('./src/cls'),
  config:   require('./src/config'),
  db:       require('./src/db/db'),
  express:  require('express'),
  i18next:  require('i18next'),
  IgoDust:  require('igo-dust'),
  logger:   require('./src/logger'),
  mailer:   require('./src/mailer'),
  Model:    require('./src/db/Model'),
  app:      require('./src/app')
};

const env = process.env.NODE_ENV || 'dev';
// dev
if (!global.IGO_CLI && env === 'dev') {
  igo.dev = require('./src/dev/index');
}

module.exports = igo;
