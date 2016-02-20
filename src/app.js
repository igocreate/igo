'use strict';

var _                 = require('lodash');
var express           = require('express');
var winston           = require('winston');

var cons              = require('consolidate');
var dust              = require('dustjs-linkedin');
var helpers           = require('./dust/helpers');
var i18next           = require('i18next');
var i18nMiddleware    = require('i18next-express-middleware');
var i18nFsBackend     = require('i18next-node-fs-backend');
var compression       = require('compression');
var cookieParser      = require('cookie-parser');
var cookieSession     = require('cookie-session');
var bodyParser        = require('body-parser');
var expressValidator  = require('express-validator');

var config            = require('./config');
var routes            = require('./routes');
var errorHandler      = require('./errorhandler');
var flash             = require('./flash');

//
var app = module.exports.app = express();

//
module.exports.run = function() {

  config.init();

  var services = {
    redis:  require('./cache'),
    mysql:  require('./db/db'),
    mailer: require('./mailer'),
  };
  _.forEach(services, function(service, key) {
    service.init(config[key]);
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

  app.use(cookieParser(config.signedCookiesSecret));
  app.use(cookieSession(config.cookieSessionConfig));
  app.use(flash);

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(expressValidator());

  app.use(i18nMiddleware.handle(i18next));
  app.use(helpers);

  app.use(errorHandler.init(app));

  routes.init(app);

  app.use(errorHandler.error);

  app.listen(config.httpport, function () {
    winston.info('Listening to port %s', config.httpport);
  });
};
