
module.exports = {
  app:      require('./src/app'),
  cache:    require('./src/cache'),
  cls:      require('./src/cls'),
  config:   require('./src/config'),
  db:       require('./src/db/db'),
  i18next:  require('i18next'),
  render:   require('consolidate').dust,
  logger:   require('winston'),
  mailer:   require('./src/mailer'),
  Model:    require('./src/db/Model'),
  Admin:    require('./src/admin/Admin')
};

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'dev') {
  module.exports.dev = require('./src/dev/index');
}
