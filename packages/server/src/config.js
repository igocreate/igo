// Load .env file in development/test, not in production
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ quiet: true });
}

const config    = {};
module.exports  = config;

const DEFAULT_COOKIE_SECRET = 'abcdefghijklmnopqrstuvwxyz';
const DEFAULT_SESSION_KEY   = 'aaaaaaaaaaa';

// A project without a readable package.json still has to boot.
const readProjectPackage = (projectRoot) => {
  try {
    return require(projectRoot + '/package.json');
  } catch {
    return {};
  }
};

// Reads the project package.json on first access rather than at init(), then
// caches it: a value set by the application always wins.
const defineProjectValue = (target, property, override, packageKey) => {
  Object.defineProperty(target, property, {
    configurable: true,
    enumerable:   true,
    get() {
      const value = override || readProjectPackage(target.projectRoot)[packageKey];
      Object.defineProperty(target, property, {
        value, writable: true, configurable: true, enumerable: true
      });
      return value;
    },
    set(value) {
      Object.defineProperty(target, property, {
        value, writable: true, configurable: true, enumerable: true
      });
    },
  });
};

//
module.exports.init = function() {

  if (config._loaded) {
    return;
  }

  config._loaded        = true;
  config.env            = process.env.NODE_ENV || 'dev';
  config.httpport       = process.env.HTTP_PORT || 3000;
  config.projectRoot    = process.cwd();

  // Identifies the app in crash emails and in every log line, which is what
  // tells one project and one environment apart once logs are pooled.
  // Resolved on read: projectRoot can still be reassigned after init().
  defineProjectValue(config, 'appname', process.env.APP_NAME,    'name');
  defineProjectValue(config, 'version', process.env.APP_VERSION, 'version');

  config.cookieSecret  = process.env.COOKIE_SECRET || DEFAULT_COOKIE_SECRET;
  config.cookieSession = {
    name: 'app',
    keys: process.env.COOKIE_SESSION_KEYS ? process.env.COOKIE_SESSION_KEYS.split(',') : [ DEFAULT_SESSION_KEY ],
    maxAge: 31 * 24 * 60 * 60 * 1000, // 31 days
    sameSite: 'Lax'
  };

  config.urlencoded = { limit: '10mb', extended: true };
  config.json       = { limit: '10mb' };

  // routes under this prefix answer in JSON, never in HTML
  config.api        = { prefix: '/api' };

  // set to false to keep serving after an uncaught exception that a request
  // already answered — only once alerting no longer relies on the crash email
  config.exitOnUncaughtException = true;

  config.i18n = {
    whitelist:            [ 'en', 'fr' ],
    preload:              [ 'en', 'fr' ],
    fallbackLng:          'en',
    backend: {
      loadPath:           'locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order:              [ 'querystring', 'localStorage', 'cookie' ],
      lookupQuerystring:  'lang',
      lookupLocalStorage: 'lang',
      lookupCookie:       'lang',
      caches:             ['localStorage', 'cookie'],
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
    driver:             'mysql',
    host:               process.env.MYSQL_HOST     || '127.0.0.1',
    port:               process.env.MYSQL_PORT     || 3306,
    user:               process.env.MYSQL_USERNAME || 'root',
    password:           process.env.MYSQL_PASSWORD || '',
    database:           process.env.MYSQL_DATABASE || 'igo',
    charset:            process.env.MYSQL_CHARSET  || 'utf8mb4',
    connectionLimit:    Number(process.env.MYSQL_MAX_CONNECTIONS) || (config.env === 'production' ? 10 : 5),
    enableKeepAlive:    true,
    debug:              false,
    debugsql:           false
  };

  // postgresql
  config.postgresql = {
    driver:             'postgresql',
    host:               process.env.POSTGRESQL_HOST     || '127.0.0.1',
    port:               process.env.POSTGRESQL_PORT     || 5432,
    user:               process.env.POSTGRESQL_USERNAME || '',
    password:           process.env.POSTGRESQL_PASSWORD || '',
    database:           process.env.POSTGRESQL_DATABASE || 'igo',
    max:                Number(process.env.POSTGRESQL_MAX_CONNECTIONS) || (config.env === 'production' ? 10 : 5),
    idleTimeoutMillis:  30000,
    connectionTimeoutMillis: 2000,
    keepAlive:          true,
    debugsql:           false
  };

  // cache
  config.redis = {
    socket: {
      host:     process.env.REDIS_HOST      || '127.0.0.1',
      port:     process.env.REDIS_PORT      || 6379,
    },
    database: process.env.REDIS_DATABASE  || 0
  };

  // logger
  config.loglevel = process.env.LOG_LEVEL || 'info';
  // 'json' for log collectors, 'human' for a terminal
  config.logformat = process.env.LOG_FORMAT || (config.env === 'production' ? 'json' : 'human');
  // set to false to silence the one-line-per-request log
  config.logrequests = config.env !== 'test';

  //
  if (config.env === 'dev') {
    config.cache_warnings = true;
  }

  //
  if (config.env === 'test') {
    config.mysql.database       = 'test';
    config.postgresql.database  = 'test';
    config.loglevel             = 'error';
  }

  //
  if (config.env === 'production') {
    config.auto_migrate         = true;
  }

  // load app config
  const configFiles = [
    '/igo.config',
    '/igo.config.cjs',
    '/app/config',
    '/app/config.cjs',
    '/app/config-' + config.env
  ];
  configFiles.forEach((file) => {
    try {
      require(config.projectRoot + file).init(config);
    } catch (err) {
      // ignore module not found error
      if (err.code !== 'MODULE_NOT_FOUND') {
        console.error(err);
      }
    }
  });

};

// default secrets make sessions forgeable: refuse to start the server with them in production
module.exports.checkSecrets = function() {
  if (config.env !== 'production') {
    return;
  }
  const defaultKeys = config.cookieSession.keys.indexOf(DEFAULT_SESSION_KEY) > -1;
  if (config.cookieSecret === DEFAULT_COOKIE_SECRET || defaultKeys) {
    throw new Error('Default cookie secrets cannot be used in production: set COOKIE_SECRET and COOKIE_SESSION_KEYS');
  }
};
