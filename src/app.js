

const compression       = require('compression');
const cookieParser      = require('cookie-parser');
const cookieSession     = require('cookie-session');
const express           = require('express');
const i18nFsBackend     = require('i18next-fs-backend');
const i18nMiddleware    = require('i18next-http-middleware');
const i18next           = require('i18next');
const igodust           = require('./engines/igodust');
const cache             = require('./cache');
const cls               = require('./cls');
const config            = require('./config');
const dbs               = require('./db/dbs');
const errorHandler      = require('./connect/errorhandler');
const flash             = require('./connect/flash');
const locals            = require('./connect/locals');
const multipart         = require('./connect/multipart');
const validator         = require('./connect/validator');
const logger            = require('./logger');
const mailer            = require('./mailer');
const plugins           = require('./plugins');

//
const app = module.exports = express();

// services to initialize
const SERVICES = [ config, igodust, logger, cache, dbs, mailer, cls, plugins ];

//
module.exports.configure = function() {

  SERVICES.forEach(service => service.init(app));

  i18next
  .use(i18nMiddleware.LanguageDetector)
  .use(i18nFsBackend)
  .init(config.i18n);

  app.enable('trust proxy');
  app.disable('x-powered-by');

  app.use(compression());
  app.use(express.static('public', { redirect: false }));
  
  if (config.env !== 'test') {
    // async error handling
    app.use(errorHandler.initDomain(app));
    // does not work in test mode, because of mock requests
    app.use(cookieParser(config.cookieSecret));
    app.use(cookieSession(config.cookieSession));
    app.use(express.urlencoded(config.urlencoded));
    app.use(express.json(config.json));
    app.use(multipart);
  }


  app.use(flash);
  app.use(validator);

  // fix crash if ?lang=cn确认
  // manually verify the lang query param
  app.use((req, res, next) => {
    const { lang } = req.query;
    if (lang && config.i18n.whitelist.indexOf(lang) < 0) {
      req.query.lang = config.i18n.fallbackLng[0];
    }
    next();
  });
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

// configured: callback function invoked when app is configured
// started: callback function invoked when server is started
module.exports.run = function(configured, started) {

  module.exports.configure();
  configured && configured();

  app.server = app.listen(config.httpport, function() {
    logger.info('Listening to port %s', config.httpport);
    started && started();
  });
};
