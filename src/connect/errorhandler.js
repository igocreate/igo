'use strict';

var domain  = require('domain');
var winston = require('winston');

var config  = require('../config');
var mailer  = require('../mailer');

// log and show error
var handle = function(req, res) {
  return function(err) {
    winston.error(req.method + ' ' + req.url + ' : ' + err);
    winston.error(err.stack);

    if (config.env === 'production') {
      res.status(500);
      res.render('errors/500');
    } else {
      res.send('<h1>' + req.url + '</h1><pre>' + err.stack + '</pre>');
    }

    if (config.errorsemail) {
      mailer.send('notif', {
        to: config.errorsemail,
        subject: 'Crash: ' + config.appname,
        message: '<h1>' + req.url + '</h1><pre>' + err.stack + '</pre>'
      })
    }
  };
};

// init domain for error handling
module.exports.init = function(app) {
  return function(req, res, next) {
    var appDomain = domain.create();
    appDomain.add(req);
    appDomain.add(res);
    appDomain.on('error', handle(req, res));
    appDomain.run(next);
  };
};

// handle express error
module.exports.error = function(err, req, res, next) {
  handle(req, res)(err);
};
