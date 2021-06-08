
const _               = require('lodash');
const async           = require('async');
const { v4: uuidv4 }  = require('uuid');

const cache           = require('../cache');

const NS              = 'cacheflash';

//
module.exports = function(req, res, next) {

  req.session.flash       = req.session.flash || {};
  res.locals.flash        = req.session.flash;

  req.session.cacheflash  = req.session.cacheflash || [];
  const cacheflash        = req.session.cacheflash;

  if (req.method === 'GET') {
    // clear flash scope
    req.session.flash       = {};
    req.session.cacheflash  = [];
  }

  // save flash data in session
  req.flash = function(key, value) {
    req.session.flash[key] = value;
  };

  // save flash data in redis
  req.cacheflash = function(key, value) {
    const uuid = uuidv4();
    req.session.cacheflash.push(uuid);
    const obj = {};
    obj[key] = value;
    cache.put(NS, uuid, obj, null, 60); // 60s
  }

  if (!cacheflash.length) {
    return next();
  }

  // async load cacheflash objects
  async.eachSeries(cacheflash, function(uuid, callback) {
    cache.get(NS, uuid, function(err, obj) {
      _.merge(res.locals.flash, obj);
      callback();
    });
  }, function() {
    next();
  });

};
