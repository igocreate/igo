'use strict';

var domain  = require('domain');
var winston = require('winston');

// log and show error
var handle = function(req, res) {
  return function(err) {
    winston.error(req.method + ' ' + req.url + ' : ' + err);
    winston.error(err.stack);
    res.send('<h1>' + req.url + '</h1><pre>' + err.stack + '</pre>');
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
