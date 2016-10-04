/*
 * cache get, put, getput, del, flushall
 */

'use strict';

var redis       = require('redis');
var winston     = require('winston');
var _           = require('lodash');
var moment      = require('moment');

var cls         = require('./cls');

var options     = null;
var redisclient = null;

var retryStrategy = function(params) {
  if (params.error.code === 'ECONNREFUSED') {
    winston.error('Redis connection refused on host ' + options.host + ':' + options.port);
    return params.error;
  }
  winston.error('Redis error ' + params.error);
  // retry in n seconds
  return params.attempt * 1000;
};


// init cache module : create redis client
module.exports.init = function(config) {
  config      = config || {};
  options     = config.redis || {};

  options     = _.defaultsDeep(options, {
    ttl:  3600,  // default ttl is 1 hour
    no_ready_check: true,
    retry_strategy: retryStrategy
  });

  redisclient = redis.createClient(options);
  if (options.password) {
    redisclient.auth(options.password);
  }
  redisclient.select(options.database || 0);
  redisclient.on('error', function (err) {
    // winston.error('' + err);
  });

  if (config.env !== 'production') {
    module.exports.flushall();
  }
};

//
module.exports.redisclient = function() {
  return redisclient;
};

//
module.exports.put = function(namespace, id, value, callback, ttl) {
  var k = namespace + '/' + id;
  var v = JSON.stringify({ v: value });

  redisclient.set(k, v, cls.bind(function(err) {
    if (callback) {
      callback(null, value);
    }
    redisclient.expire(k, ttl || options.ttl);
  }));
};

//
module.exports.get = function(namespace, id, callback) {

  var k = namespace + '/' + id;
  redisclient.get(k, cls.bind(function(err, value) {
    if (!value) {
      return callback('notfound');
    }
    // found obj in redis
    var obj = JSON.parse(value);
    obj     = obj.v;
    if (obj === null) {
      return callback(null, null);
    }
    obj = deserializeDates(obj);
    callback(null, obj);
  }));
};

 // - returns object from cache if exists.
 // - calls func(id, callback) otherwise and put result in cache
module.exports.fetch = function(namespace, id, func, callback) {
  module.exports.get(namespace, id, function(err, obj) {
    if (err === 'notfound') {
      // invoke
      // console.log(namespace + '/' + id + ' not found in cache');
      func(id, function(err, result) {
        // put in cache and return result obj
        module.exports.put(namespace, id, result);
        callback(null, result);
      });
    } else {
      callback(err, obj);
    }
  });
};

// retro compatibility
module.exports.getput = module.exports.fetch;

//
module.exports.info = function(callback) {
  redisclient.info(cls.bind(callback));
};

//
module.exports.del = function(namespace, id, callback) {
  var k = namespace+'/'+id;
  // remove from redis
  redisclient.del(k, cls.bind(callback));
};

//
module.exports.flushall = function(callback) {
  redisclient.flushall(cls.bind(callback));
  winston.info('Cache flush');
};


var deserializeDates = function(obj) {
  var re = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/;
  if (_.isString(obj) && obj.match(re)) {
    return moment(obj, moment.ISO_8601).toDate();
  } else if (_.isObject(obj) && _.keys(obj).length > 0) {
    _.forIn(obj, function(value, key) {
      obj[key] = deserializeDates(value);
    });
  }
  return obj;
};
