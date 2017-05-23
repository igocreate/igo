'use strict';

const path              = require('path');

const _                 = require('lodash');
const express           = require('express');
const winston           = require('winston');

const cons              = require('consolidate');
const dust              = require('dustjs-linkedin');
const i18next           = require('i18next');
const i18nMiddleware    = require('i18next-express-middleware');
const i18nFsBackend     = require('i18next-node-fs-backend');
const compression       = require('compression');
const cookieParser      = require('cookie-parser');
const cookieSession     = require('cookie-session');
const bodyParser        = require('body-parser');
const expressValidator  = require('express-validator');

const config            = require('./config');
const helpers           = require('./connect/helpers');
const multipart         = require('./connect/multipart');
const flash             = require('./connect/flash');
const errorHandler      = require('./connect/errorhandler');
const routes            = require('./routes');
const plugins           = require('./plugins');

//
const app = module.exports = express();

var services = {
  redis:  require('./cache'),
  mysql:  require('./db/db'),
  mailer: require('./mailer'),
  cls:    require('./cls'),
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
  app.engine('dust', cons.dust);
  app.set('view engine', 'dust');
  app.set('views', './views');

  app.use(compression());
  app.use(express.static('public'));

  if (config.env !== 'test') {
    app.use(errorHandler.init(app));
    app.use(cookieParser(config.signedCookiesSecret));
    app.use(cookieSession(config.cookieSessionConfig));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(multipart);
  }

  app.use(flash);
  app.use(expressValidator());
  app.use(i18nMiddleware.handle(i18next));
  app.use(helpers);

  routes.init(app);

  if (config.env !== 'test') {
    app.use(errorHandler.error);
  }

}

//
module.exports.run = function() {

  module.exports.configure();

  app.server = app.listen(config.httpport, function () {
    winston.info('Listening to port %s', config.httpport);
  });
};
