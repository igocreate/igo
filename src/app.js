

const compression       = require('compression');
const cookieParser      = require('cookie-parser');
const cookieSession     = require('cookie-session');
const express           = require('express');
const i18nFsBackend     = require('i18next-fs-backend');
const i18nMiddleware    = require('i18next-http-middleware');
const i18next           = require('i18next');
const igodust           = require('./engines/igodust');
const cache             = require('./cache');
const config            = require('./config');
const dbs               = require('./db/dbs');
const errorHandler      = require('./connect/errorhandler');
const flash             = require('./connect/flash');
const locals            = require('./connect/locals');
const multipart         = require('./connect/multipart');
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

  // Config must be initialized first
  await config.init(app);

  // Parallel initialization of services
  await Promise.all([
    igodust.init(app),
    logger.init(app),
    cache.init(app),
    dbs.init(app),
    mailer.init(app)
  ]);

  // Await i18next initialization
  await i18next
  .use(i18nMiddleware.LanguageDetector)
  .use(i18nFsBackend)
  .init(config.i18n);

  app.enable('trust proxy');
  app.disable('x-powered-by');

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
    app.use(errorHandler.initDomain(app));
    // does not work in test mode, because of mock requests
    app.use(cookieParser(config.cookieSecret));
    app.use(config.cookieSessionMiddleware || cookieSession(config.cookieSession));
    app.use(express.urlencoded(config.urlencoded));
    app.use(express.json(config.json));
    app.use(multipart);
  }


  app.use(flash);
  app.use(validator);

  // fix crash if lang is incorrect (in query or in cookies)
  // Use Set for O(1) lookup instead of Array.indexOf O(n)
  const whitelist = new Set(config.i18n.whitelist);
  app.use(validateLang(whitelist, config.i18n.fallbackLng));
  app.use(i18nMiddleware.handle(i18next));

  app.use(locals);
  app.use(igodust.middleware);

  // load routes
  const routes = require('./routes');
  routes.init(app);

  if (config.env !== 'test') {
    // express error handling
    app.use(errorHandler.error);
  }
};

// configured: function invoked when app is configured
// started:y' function invoked when server is started
module.exports.run = async (configured, started) => {

  await module.exports.configure();
  configured && configured();

  app.server = app.listen(config.httpport, function() {
    logger.info('Listening to port %s', config.httpport);
    started && started();
  });
};
