

const _                 = require('lodash');
const bodyParser        = require('body-parser');
const compression       = require('compression');
const cookieParser      = require('cookie-parser');
const cookieSession     = require('cookie-session');
const express           = require('express');
const expressValidator  = require('express-validator');
const i18nFsBackend     = require('i18next-node-fs-backend');
const i18nMiddleware    = require('i18next-express-middleware');
const i18next           = require('i18next');

const cache             = require('./cache');
const cls               = require('./cls');
const config            = require('./config');
const db                = require('./db/db');
const errorHandler      = require('./connect/errorhandler');
const flash             = require('./connect/flash');
const logger            = require('./logger');
const mailer            = require('./mailer');
const multipart         = require('./connect/multipart');
const plugins           = require('./plugins');


//
const app = module.exports = express();

var services = {
  logger,
  cache,
  db,
  mailer,
  cls
};

//
module.exports.init = function(name, service) {
  services[name] = service;
};

//
module.exports.configure = function() {

  config.init();

  _.forEach(services, function(service, key) {
    service.init(config);
  });

  plugins.init();

  i18next
    .use(i18nMiddleware.LanguageDetector)
    .use(i18nFsBackend)
    .init(config.i18n);

  app.enable('trust proxy');

  // template engine
  if (config.engine === 'igo-dust') {
    // igo-dust
    const IgoDust = require('igo-dust');
    
    app.engine('dust', IgoDust.engine);
    app.set('view engine', 'dust');
  } else {
    // dustjs-linkedin
    const cons    = require('consolidate');

    app.engine('dust', cons.dust);
    app.set('view engine', 'dust');
    app.set('views', './views');
  }
  
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
  app.use(expressValidator());
  app.use(i18nMiddleware.handle(i18next));
  const helpers = require('./connect/helpers');
  app.use(helpers);

  // load routes
  const routes = require('./routes');
  routes.init(app);

  if (config.env !== 'test') {
    app.use(errorHandler.error);
  }

}

//
module.exports.run = function() {

  module.exports.configure();

  app.server = app.listen(config.httpport, function () {
    logger.info('Listening to port %s', config.httpport);
  });
};
