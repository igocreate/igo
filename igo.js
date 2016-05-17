
module.exports = {
  app:      require('./src/app'),
  cache:    require('./src/cache'),
  cls:      require('./src/cls'),
  config:   require('./src/config'),
  db:       require('./src/db/db'),
  i18next:  require('i18next'),
  render:   require('consolidate').dust,
  mailer:   require('./src/mailer'),
  Model:    require('./src/db/Model')
};
