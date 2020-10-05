

const _                 = require('lodash');
const bodyParser        = require('body-parser');
const compression       = require('compression');
const cookieParser      = require('cookie-parser');
const cookieSession     = require('cookie-session');
const express           = require('express');
const i18nFsBackend     = require('i18next-node-fs-backend');
const i18nMiddleware    = require('i18next-express-middleware');
const i18next           = require('i18next');

const cache             = require('./cache');
const cls               = require('./cls');
const config            = require('./config');
const db                = require('./db/db');
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

const ENGINES = {
  'dust':       require('./engines/dust'),
  'igo-dust':   require('./engines/igo-dust')
};

const SERVICES = [ config, logger, cache, db, mailer, cls, plugins ]


//
module.exports.configure = function() {

  SERVICES.forEach(service => service.init());

  i18next
    .use(i18nMiddleware.LanguageDetector)
    .use(i18nFsBackend)
    .init(config.i18n);

  app.enable('trust proxy');

  // template engine
  const engine = ENGINES[config.engine] || ENGINES['igo-dust'];
  engine.init(app);
  app.engine = engine;

  app.use(compression());
  app.use(express.static('public'));
  
  if (config.env !== 'test') {
    app.use(errorHandler.init(app));
    app.use(cookieParser(config.signedCookiesSecret));
    app.use(cookieSession(config.cookieSessionConfig));
    app.use(bodyParser.json({ limit: config.bodyParser.limit }));
    app.use(bodyParser.urlencoded({ limit: config.bodyParser.limit, extended: true }));
    app.use(multipart);
  }
  
  app.use(flash);
  app.use(validator);
  app.use(i18nMiddleware.handle(i18next));
  app.use(locals);
  app.use(engine.middleware);

  // load routes
  const routes = require('./routes');
  routes.init(app);

  if (config.env !== 'test') {
    app.use(errorHandler.error);
  }

}

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
