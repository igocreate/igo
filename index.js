
const igo = {
  cache:      require('./src/cache'),
  CacheStats: require('./src/db/CacheStats'),
  cls:        require('./src/cls'), // will be deprecated
  config:     require('./src/config'),
  dbs:        require('./src/db/dbs'),
  express:    require('express'),
  i18next:    require('i18next'),
  IgoDust:    require('igo-dust'),
  logger:     require('./src/logger'),
  mailer:     require('./src/mailer'),
  migrations: require('./src/db/migrations'),
  Model:      require('./src/db/Model'),
  Form:       require('./src/forms/Form'),
  app:        require('./src/app')
};

const env = process.env.NODE_ENV || 'dev';
// dev
if (!global.IGO_CLI && env === 'dev') {
  igo.dev = require('./src/dev/index');
}

module.exports = igo;
