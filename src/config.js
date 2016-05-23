'use strict';

var _           = require('lodash');
var winston     = require('winston');
// var papertrail  = require('winston-papertrail').Papertrail;

require('dotenv').config({silent: true});

var config      = {};
module.exports  = config;

module.exports.init = function() {

  if (config.loaded) return;

  config.loaded         = true;
  config.env            = process.env.NODE_ENV || 'dev';
  config.httpport       = process.env.HTTP_PORT || 3000;

  config.signedCookiesSecret = 'abcdefghijklmnopqrstuvwxyz';
  config.cookieSessionConfig = {
    name: 'app',
    keys: [
      'aaaaaaaaaaa',
      'bbbbbbbbbbb',
      'ccccccccccc'
    ]
  };

  config.i18n = {
    lngs: ['en', 'fr'],
    fallbackLng: 'en',
    backend: {
      loadPath: 'locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['querystring', 'path', 'session'],
      lookupPath: 'lng',
      lookupQuerystring: 'lng'
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
  };

  config.redis = {
    host:     process.env.REDIS_HOST      || 'localhost',
    port:     process.env.REDIS_PORT      || 6379,
    database: process.env.REDIS_DATABASE  || 0
  };

  // logging with timestamp
  winston.remove(winston.transports.Console);
  winston.add(winston.transports.Console, {
    timestamp: true
  });

  if (config.env === 'test') {
    config.mysql.database = 'test';
    config.nodemailer     = null;
    winston.add(winston.transports.File, {
      filename: './logs/test.log',
      colorize: true,
      json: false
    });
    winston.remove(winston.transports.Console);
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
