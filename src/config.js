
require('dotenv').config({silent: true});


//
const config    = {};
module.exports  = config;

//
module.exports.init = function() {

  if (config._loaded) {
    return;
  }

  config._loaded        = true;
  config.env            = process.env.NODE_ENV || 'dev';
  config.httpport       = process.env.HTTP_PORT || 3000;

  config.bodyParser    = { limit: '1mb' };
  config.cookieSecret  = 'abcdefghijklmnopqrstuvwxyz';
  config.cookieSession = {
    name: 'app',
    keys: [ 'aaaaaaaaaaa' ],
    maxAge: 31 * 24 * 60 * 60 * 1000, // 31 days
    sameSite: 'Lax'
  };

  config.i18n = {
    whitelist:            [ 'en', 'fr' ],
    preload:              [ 'en', 'fr' ],
    fallbackLng:          'en',
    backend: {
      loadPath:           'locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order:              [ 'querystring', 'path', 'cookie' ],
      lookupPath:         'lang',
      lookupQuerystring:  'lang',
      caches:             false
    },
  };

  config.mailer = {
    transport: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    },
    defaultfrom:  process.env.SMTP_FROM,
    subaccount:   process.env.SMTP_SUBACCOUNT
  };

  // default db is mysql
  config.databases = [ 'mysql' ];

  // config.skip_reinit_db = true;

  // mysql
  config.mysql = {
    driver:   'mysql',
    host:     process.env.MYSQL_HOST     || 'localhost',
    port:     process.env.MYSQL_PORT     || 3306,
    user:     process.env.MYSQL_USERNAME || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'igo',
    charset:  process.env.MYSQL_CHARSET  || 'utf8mb4',
    debug:    false,
    connectionLimit: 5,
    debugsql: false
  };

  // postgresql
  config.postgresql = {
    driver:   'postgresql',
    host:     process.env.POSTGRESQL_HOST     || 'localhost',
    port:     process.env.POSTGRESQL_PORT     || 5432,
    user:     process.env.POSTGRESQL_USERNAME || '',
    password: process.env.POSTGRESQL_PASSWORD || '',
    database: process.env.POSTGRESQL_DATABASE || 'igo',
    max:      5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    debugsql: false
  };

  // cache
  config.redis = {
    host:     process.env.REDIS_HOST      || 'localhost',
    port:     process.env.REDIS_PORT      || 6379,
    database: process.env.REDIS_DATABASE  || 0
  };

  //
  if (config.env === 'test') {
    config.mysql.database       = 'test';
    config.postgresql.database  = 'test';
  }

  //
  if (config.env === 'production') {
    config.auto_migrate = true;
  }

  // load app config
  const configFiles = [
    '/app/config',
    '/app/config-' + config.env
  ];
  configFiles.forEach((file) => {
    try {
      require(process.cwd() + file).init(config);
    } catch (err) {
      // ignore module not found error
      if (err.code !== 'MODULE_NOT_FOUND') {
        console.error(err);
      }
    }
  });

};
