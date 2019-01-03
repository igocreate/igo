
require('dotenv').config({silent: true});


const config      = {};

//
module.exports  = config;

//
module.exports.init = function() {
  if (config._loaded) {
    return;
  }

  config._loaded         = true;
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
    defaultfrom: '',
    subject:  (email, data) => `emails.${email}.subject`,
    template: (email, data) => `./views/emails/${email}.dust`
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

  //
  if (config.env === 'test') {
    config.mysql.database = 'test';
    config.mailer         = null;
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
      console.error(err);
    }
  });

};
