

const compression       = require('compression');
const cookieParser      = require('cookie-parser');
const express           = require('express');
const i18nFsBackend     = require('i18next-fs-backend');
const i18nMiddleware    = require('i18next-http-middleware');
const i18next           = require('i18next');
const igodust           = require('./engines/igodust');
const cache             = require('./cache');
const config            = require('./config');
const db                = require('@igojs/db');
const assets            = require('./connect/assets');
const { unlessApi }     = require('./api');
const errorHandler      = require('./connect/errorhandler');
const flash             = require('./connect/flash');
const health            = require('./connect/health');
const locals            = require('./connect/locals');
const multipart         = require('./connect/multipart');
const requestLogger     = require('./connect/requestlogger');
const securityHeaders   = require('./connect/security');
const session           = require('./connect/session');
const validator         = require('./connect/validator');
const logger            = require('./logger');
const mailer            = require('./mailer');

//
const app = module.exports = express();


// Language validation middleware
const validateLang = (whitelist, fallbackLng) => {
  return (req, res, next) => {
    ['query', 'cookies'].forEach(src => {
      const { lang } = req[src];
      if (lang && !whitelist.has(lang)) {
        req[src].lang = fallbackLng;
      }
    });
    next();
  };
};


// Configure the Express app
module.exports.configure = async () => {

  // Initialize config (idempotent, safe to call multiple times)
  await config.init();
  config.checkSecrets();

  // Initialize @igojs/db with injected dependencies
  const utils = require('./utils');
  db.init({
    config,
    cache,
    logger,
    utils,
    errorhandler: errorHandler,
  });

  // Parallel initialization of services
  await Promise.all([
    igodust.init(app),
    logger.init(app),
    cache.init(app),
    db.dbs.init(app),
    mailer.init(app)
  ]);

  // Await i18next initialization
  // shallow copy: init() writes defaultNS into the object it receives
  await i18next
  .use(i18nMiddleware.LanguageDetector)
  .use(i18nFsBackend)
  .init({ ...config.i18n });

  app.enable('trust proxy');
  app.disable('x-powered-by');
  app.use(securityHeaders);

  // Enable view caching in production
  if (config.env === 'production') {
    app.enable('view cache');
  }

  // Compression with threshold
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 1024 // Only compress if > 1KB
  }));

  // Static files with caching in production
  app.use(express.static('public', {
    redirect:     false,
    maxAge:       config.env === 'production' ? '1y' : 0,
    etag:         true,
    lastModified: true
  }));

  if (config.env !== 'test') {
    // async error handling
    app.use(errorHandler.initContext(app));
    // does not work in test mode, because of mock requests
    app.use(cookieParser(config.cookieSecret));
    app.use(session(config.cookieSession));
    app.use(express.urlencoded(config.urlencoded));
    app.use(express.json(config.json));
    app.use(multipart);
  }


  // before the request logger: probed every few seconds, these routes would
  // otherwise be most of the request log
  health.init(app);

  app.use(requestLogger);
  app.use(unlessApi(flash));
  app.use(validator);

  // fix crash if lang is incorrect (in query or in cookies)
  // Use Set for O(1) lookup instead of Array.indexOf O(n)
  const whitelist = new Set(config.i18n.whitelist);
  app.use(validateLang(whitelist, config.i18n.fallbackLng));
  app.use(i18nMiddleware.handle(i18next));

  app.use(unlessApi(locals));
  app.use(unlessApi(assets));
  app.use(unlessApi(igodust.middleware));

  // Auto-wire @igojs/component if installed in the project.
  // Registers component.middleware + GET /__component/templates and /__component/component.
  try {
    require('@igojs/component').init(app);
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') {
      throw err;
    }
  }

  // load routes
  const routes = require('./routes');
  routes.init(app);

  if (config.env !== 'test') {
    // express error handling
    app.use(errorHandler.error);
  }
};

const closeServer = () => new Promise((resolve) => {
  if (!app.server?.listening) {
    return resolve();
  }
  // resolves once the connections still being served are done
  app.server.close(() => resolve());
});

const step = async (what, fn) => {
  try {
    await fn();
  } catch (err) {
    // one failed step must not keep the next from running
    logger.warn(`Shutdown: ${what} failed: ${err.message}`, { stack: err.stack });
  }
};

let shuttingDown = false;

// Closes what the application holds, in the order that lets each step still use
// what the next one closes. Exported so a script or a cron, which has no signal
// to wait for, can call it when its work is done.
module.exports.shutdown = async () => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info('Shutdown: starting');

  // readiness answers 503 from here on, and config.shutdownDelay leaves the load
  // balancer time to see it before the socket stops accepting connections
  health.drain();
  if (config.shutdownDelay) {
    await new Promise(resolve => setTimeout(resolve, config.shutdownDelay));
  }

  await step('closing server', closeServer);
  await step('onShutdown', async () => await config.onShutdown?.());
  await step('closing databases', db.dbs.close);
  await step('closing cache', cache.close);

  logger.info('Shutdown: done');
};

// its own flag, not shutdown()'s: that one also guards a script calling
// shutdown() on its own, which is not a signal anyone is waiting on
let signalled = false;

const onSignal = (signal) => async () => {
  // a second Ctrl-C is someone asking to stop waiting
  if (signalled) {
    logger.warn(`${signal} received again: exiting now`);
    return process.exit(1);
  }
  signalled = true;
  logger.info(`${signal} received`);

  // a shutdown that hangs is worse than an abrupt one: the process manager sends
  // SIGKILL in the end anyway, and this at least leaves a log saying where it hung
  const timer = setTimeout(() => {
    logger.error(`Shutdown: still running after ${config.shutdownTimeout}ms, exiting`);
    process.exit(1);
  }, config.shutdownTimeout);
  timer.unref();

  await module.exports.shutdown();
  clearTimeout(timer);
  process.exit(0);
};

// configured: function invoked when app is configured
// started: function invoked when server is started
module.exports.run = async (configured, started) => {

  await module.exports.configure();
  configured && configured();

  // only run() installs them: a CLI command or a script has nothing to keep
  // alive, and mocha would never get its hand back
  if (config.env !== 'test') {
    process.on('SIGTERM', onSignal('SIGTERM'));
    process.on('SIGINT',  onSignal('SIGINT'));
  }

  app.server = app.listen(config.httpport, function() {
    logger.info('Listening to port %s', config.httpport);
    started && started();
  });
};
