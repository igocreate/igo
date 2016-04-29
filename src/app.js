'use strict';

var _                 = require('lodash');
var express           = require('express');
var winston           = require('winston');

var cons              = require('consolidate');
var dust              = require('dustjs-linkedin');
var i18next           = require('i18next');
var i18nMiddleware    = require('i18next-express-middleware');
var i18nFsBackend     = require('i18next-node-fs-backend');
var compression       = require('compression');
var cookieParser      = require('cookie-parser');
var cookieSession     = require('cookie-session');
var bodyParser        = require('body-parser');
var expressValidator  = require('express-validator');

var config            = require('./config');
var helpers           = require('./connect/helpers');
var filters           = require('./connect/filters');
var multipart         = require('./connect/multipart');
var flash             = require('./connect/flash');
var errorHandler      = require('./connect/errorhandler');
var routes            = require('./routes');

//
var app = module.exports = express();

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
module.exports.init = function() {

  config.init();

  _.forEach(services, function(service, key) {
    service.init(config);
  });

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
    app.use(cookieParser(config.signedCookiesSecret));
    app.use(cookieSession(config.cookieSessionConfig));
    app.use(flash);
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(multipart);
  }

  app.use(expressValidator());
  app.use(i18nMiddleware.handle(i18next));
  app.use(helpers);
  app.use(filters);

  if (config.env !== 'test') {
    app.use(errorHandler.init(app));
  }

  routes.init(app);

  if (config.env !== 'test') {
    app.use(errorHandler.error);
  }

}

//
module.exports.run = function() {

  module.exports.init();

  app.listen(config.httpport, function () {
    winston.info('Listening to port %s', config.httpport);
  });
};
