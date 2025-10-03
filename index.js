
const igo = {
  app:           require('./src/app'),
  cache:         require('./src/cache'),
  CacheStats:    require('./src/db/CacheStats'),
  config:        require('./src/config'),
  dev:           require('./src/dev/index'),
  dbs:           require('./src/db/dbs'),
  express:       require('express'),
  i18next:       require('i18next'),
  IgoDust:       require('igo-dust'),
  logger:        require('./src/logger'),
  mailer:        require('./src/mailer'),
  migrations:    require('./src/db/migrations'),
  Model:         require('./src/db/Model'),
  ModelRegistry: require('./src/db/ModelRegistry'),
  Form:          require('./src/forms/Form'),
};

module.exports = igo;