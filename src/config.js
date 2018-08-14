'use strict';

var _           = require('lodash');
var winston     = require('winston');
var Papertrail  = require('winston-papertrail').Papertrail;

require('dotenv').config({silent: true});

var config      = {};
module.exports  = config;

module.exports.init = function() {

  if (config.loaded) return;

  config.loaded         = true;
  config.env            = process.env.NODE_ENV || 'dev';
  config.httpport       = process.env.HTTP_PORT || 3000;

  config.bodyParser           = { limit: '100kb' };
  config.signedCookiesSecret  = 'abcdefghijklmnopqrstuvwxyz';
  config.cookieSessionConfig  = {
    name: 'app',
    keys: [ 'aaaaaaaaaaa' ],
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  };

  config.i18n = {
    whitelist:            [ 'en', 'fr' ],
    preload:              [ 'en', 'fr' ],
    fallbackLng:          'en',
    backend: {
      loadPath:           'locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order:              [ 'querystring', 'path', 'cookie' ],
      lookupPath:         'lang',
      lookupQuerystring:  'lang',
      lookupCookie:       'lang',
      caches:             [ 'cookie' ]
    },
  };

  config.mailer = {
    transport: {
      host: null,
      port: 465,
      secure: true,
      auth: {
        user: null,
        pass: null
      },
      subaccount: null
    },
    support: {
      email: null
    },
    defaultfrom: ''
  };

  config.mysql = {
    host     : process.env.MYSQL_HOST     || 'localhost',
    port     : process.env.MYSQL_PORT     || 3306,
    user     : process.env.MYSQL_USERNAME || 'root',
    password : process.env.MYSQL_PASSWORD || '',
    database : process.env.MYSQL_DATABASE || 'igo',
    debug    : false,
    connectionLimit : 5,
    debugsql : false
  };

  config.redis = {
    host:     process.env.REDIS_HOST      || 'localhost',
    port:     process.env.REDIS_PORT      || 6379,
    database: process.env.REDIS_DATABASE  || 0
  };

  // logging with timestamp
  winston.clear();
  winston.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.splat(),
      winston.format.simple()
    ),
  }));
  if (process.env.PAPERTRAIL_HOST && config.env !== 'test') {
    winston.add(new winston.transports.Papertrail({
      host:     process.env.PAPERTRAIL_HOST,
      port:     process.env.PAPERTRAIL_PORT
    }));
  }

  if (config.env === 'test') {
    config.mysql.database = 'test';
    config.nodemailer     = null;
    winston.clear();
    winston.add(new winston.transports.File({
      filename: './logs/test.log',
      colorize: true,
      json: false
    }));
  }

  // load app config
  var configFiles = [
    '/app/config',
    // '/app/config/' + config.env
  ];
  configFiles.forEach(function(file) {
    try {
      require(process.cwd() + file).init(config);
    } catch (err) {
      winston.error(err);
    }
  });

  winston.info('Config loaded env: ' + config.env);
  // console.dir(config);
};
