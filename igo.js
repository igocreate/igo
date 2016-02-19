
module.exports = {
  app:    require('./src/app'),
  cache:  require('./src/cache'),
  cls:    require('./src/cls'),
  db:     require('./src/db/db'),
  Model:  require('./src/db/model'),
  test:   function() { require('./src/test/init'); },
};
