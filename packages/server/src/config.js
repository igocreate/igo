// Load .env file in development/test, not in production
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ quiet: true });
}

const path = require('path');

const config    = {};
module.exports  = config;

const DEFAULT_COOKIE_SECRET = 'abcdefghijklmnopqrstuvwxyz';
const DEFAULT_SESSION_KEY   = 'aaaaaaaaaaa';

// The nearest package.json at or above projectRoot: a build directory (dist/)
// has none of its own, and a project without one at all still has to boot.
const readProjectPackage = (projectRoot) => {
  let dir = path.resolve(projectRoot);
  for (;;) {
    try {
      return require(path.join(dir, 'package.json'));
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) {
        return {};
      }
      dir = parent;
    }
  }
};

// Computed on first access rather than at init(), then cached: projectRoot can
// still be reassigned after init(), and a value set by the application wins.
const defineLazy = (target, property, compute) => {
  const settle = (value) => Object.defineProperty(target, property, {
    value, writable: true, configurable: true, enumerable: true
  });
  Object.defineProperty(target, property, {
    configurable: true,
    enumerable:   true,
    get() {
      const value = compute();
      settle(value);
      return value;
    },
    set: settle,
  });
};

const defineProjectValue = (target, property, override, packageKey) =>
  defineLazy(target, property, () => override || readProjectPackage(target.projectRoot)[packageKey]);

// LOG_REQUESTS=true|false|<status floor>; anything else keeps the default.
const parseLogRequests = (value, fallback) => {
  if (value === 'true' || value === 'false') {
    return value === 'true';
  }
  const floor = Number(value);
  return value && Number.isInteger(floor) && floor > 0 ? floor : fallback;
};

module.exports.parseLogRequests   = parseLogRequests;
module.exports.readProjectPackage = readProjectPackage;

//
module.exports.init = function() {

  if (config._loaded) {
    return;
  }

  config._loaded        = true;
  config.env            = process.env.NODE_ENV || 'dev';
  config.httpport       = process.env.HTTP_PORT || 3000;
  config.projectRoot    = process.cwd();

  // Resolved on read: projectRoot can still be reassigned after init().
  // appname titles the crash emails; servicename and environment tag the logs,
  // from the variables OpenTelemetry reads so a log line and its trace agree —
  // NODE_ENV cannot name the deployment, a staging runs in production mode.
  defineProjectValue(config, 'appname',     process.env.APP_NAME,          'name');
  defineProjectValue(config, 'servicename', process.env.OTEL_SERVICE_NAME, 'name');
  defineProjectValue(config, 'version',     process.env.APP_VERSION,       'version');
  config.environment    = process.env.ENVIRONMENT || config.env;

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

  // Security headers on every response. `false` on a key drops that header,
  // `config.security = false` drops them all. `csp` is for the pages and left to
  // the project; `apiCsp` and `apiCacheControl` apply to API requests.
  config.security = {
    noSniff:           true,
    frameOptions:      'SAMEORIGIN',
    referrerPolicy:    'strict-origin-when-cross-origin',
    permissionsPolicy: 'camera=(), microphone=(), geolocation=()',
    hsts:              'max-age=63072000; includeSubDomains',
    csp:               null,
    apiCsp:            'default-src \'none\'; frame-ancestors \'none\'',
    apiCacheControl:   'no-store',
  };

  // Liveness on `path`, readiness on `path`/ready — the latter probes the
  // dependencies and answers 503 when one is down, which is what takes the
  // instance out of a load balancer. `false` drops both routes.
  // A probe set to 'optional' is reported but never brings readiness down: the
  // cache is gone, igo serves without it, and the instance stays in rotation.
  // Anything else truthy is critical.
  config.health = {
    path:    '/health',
    db:      true,
    cache:   'optional',
    // free bytes below which the instance can no longer write its logs and its
    // uploads, and has to leave the rotation
    disk:    50 * 1024 * 1024,
    timeout: 500,
  };

  // set to false to keep serving after an uncaught exception that a request
  // already answered — only once alerting no longer relies on the crash email
  config.exitOnUncaughtException = true;

  // On SIGTERM/SIGINT: readiness answers 503, then igo waits shutdownDelay before
  // closing the socket, so a load balancer stops routing here first. 0 by default
  // because that wait is dead time without one; behind a load balancer, set it
  // above its check interval. shutdownTimeout is the ceiling on the whole
  // shutdown, and the process manager's own kill timeout has to exceed their sum.
  config.shutdownDelay   = 0;
  config.shutdownTimeout = 10000;
  // async function invoked between the server closing and the database and cache
  // being released: where a project drains its own pools and flushes its exporters
  config.onShutdown      = null;

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
  // true logs every request, false none. A number is a status floor: 400 keeps
  // the errors and drops the successes, which is what keeps a log bill down
  // once latency and error rate come from metrics. A deployment setting, like
  // the format, hence LOG_REQUESTS.
  config.logrequests = parseLogRequests(process.env.LOG_REQUESTS, config.env !== 'test');

  // Keys whose value redact() replaces; null keeps the default of src/redact.js.
  // A pattern set here replaces it, so extend redact.DEFAULT_SENSITIVE_KEYS:
  //   config.sensitiveKeys = new RegExp(`${redact.DEFAULT_SENSITIVE_KEYS.source}|iban`, 'i');
  config.sensitiveKeys = null;

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
