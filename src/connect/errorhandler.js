'use strict';

var domain  = require('domain');
var winston = require('winston');

var config  = require('../config');
var mailer  = require('../mailer');

var formatMessage = function(req, err) {
  var url     = req.protocol + '://' + req.hostname + req.url;

  var message = '<h1>' + req.url + '</h1>';
  message = message + '<pre>' + err.stack + '</pre>';

  var details = [
    '<td>url</td><td>' + url + '</td>',
    '<td>session</td><td>' + JSON.stringify(req.session) + '</td>',
    '<td>referer</td><td>' + req.get('Referer') + '</td>'
  ];
  message = message + '<table><tr>' + details.join('</tr><tr>') + '</tr></table>';
  return message;
};

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
        message: formatMessage(req, err)
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
    appDomain.on('error', function(err) {
      handle(req, res)(err);
      setTimeout(function() {
        process.exit(1);
      }, 100);
    });
    appDomain.run(next);
  };
};

// handle express error
module.exports.error = function(err, req, res, next) {
  handle(req, res)(err);
};
