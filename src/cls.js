

const cls       = require('continuation-local-storage');

const logger    = require('./logger');
const config    = require('./config');

let ns = null;

// load config
module.exports.init = function() {
  const options = config.cls || {};
  ns            = options.namespace || 'igo';
  cls.createNamespace(ns);
};

//
module.exports.middleware = function(req, res, next) {
  const namespace = cls.getNamespace(ns);
  namespace.bindEmitter(req);
  namespace.bindEmitter(res);
  namespace.run(function() {
    try {
      next();
    } catch (err) {
      logger.error('Igo cls error: ' + err);
    }
  });
};

//
module.exports.getNamespace = function(name) {
  return cls.getNamespace(name || ns);
};

//
module.exports.bind = function(callback) {
  const namespace = module.exports.getNamespace();
  if (namespace && callback) {
    return namespace.bind(callback);
  }
  return callback;
};
