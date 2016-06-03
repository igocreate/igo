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

    if (config.mailcrashto) {
      mailer.send('crash', {
        to:       config.mailcrashto,
        subject:  [ config.appname, 'Crash:', err ].join(' '),
        body:     formatMessage(req, err)
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
      gracefullyShutdown(app);
    });
    appDomain.run(next);
  };
};

// handle express error
module.exports.error = function(err, req, res, next) {
  handle(req, res)(err);
};


// https://nodejs.org/api/domain.html
var gracefullyShutdown = function(app) {

  try {
    // make sure we close down within N seconds
    var killtimer = setTimeout(() => {
      process.exit(1);
    }, 3000);
    // But don't keep the process open just for that!
    killtimer.unref();

    // stop taking new requests.
    app.server.close();

  } catch (err) {
    // oh well, not much we can do at this point.
    console.error('Error shutting down gracefully!', err.stack);
  }
}
