'use strict';

var cls       = require('continuation-local-storage');
var winston   = require('winston');

var ns = null;

// load config
module.exports.init = function(config) {
  var options = config && config.cls || {};
  ns          = options.namespace || 'igo';
  cls.createNamespace(ns);
};

//
module.exports.middleware = function(req, res, next) {
  var namespace = cls.getNamespace(ns);
  namespace.bindEmitter(req);
  namespace.bindEmitter(res);
  namespace.run(function() {
    try {
      next();
    } catch (err) {
      winston.error('cls caught err: ' + err);
    }
  });
};

//
module.exports.getNamespace = function(name) {
  return cls.getNamespace(name || ns);
};

//
module.exports.bind = function(callback) {
  var namespace = module.exports.getNamespace();
  if (namespace && callback) {
    return namespace.bind(callback);
  }
  return callback;
}
