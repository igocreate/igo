/*
 * cache get, put, getput, del, flushall
 */

'use strict';

var redis       = require('redis');
var winston     = require('winston');

var options     = null;
var redisclient = null;

//
module.exports.init = function(opts) {
  options     = opts;
  options.ttl = options.ttl || 3600; // default ttl is 1 hour

  redisclient = redis.createClient(options.port, options.host, {
    no_ready_check: true
  });
  if (options.password) {
    redisclient.auth(options.password);
  }
  redisclient.select(options.database || 0);
  redisclient.on("error", function (err) {
    console.error(err);
    winston.error("redisclient error " + err);
  });
};

//
module.exports.redisclient = function() {
  return redisclient;
};

//
module.exports.put = function(namespace, id, value, callback, ttl) {
  var k = namespace + '/' + id;
  var v = value ? JSON.stringify(value) : null;
  redisclient.set(k, v, function(err) {
    if (callback) {
      callback(null, value);
    }
    redisclient.expire(k, ttl || options.ttl);
  });
};

//
module.exports.get = function(namespace, id, callback) {

  var k = namespace + '/' + id;
  redisclient.exists(k, function(err, exists) {
    if (exists) {
      // console.log('found '+k+ ' from redis cache');
      redisclient.get(k, function(err, value) {
        if (value !== undefined) {
          // found obj in redis
          var obj = JSON.parse(value);
          [
            'date', 'creation', 'publication', 'datelimit', 'birthdate'
          ].forEach(function(attr) {
            if (obj && obj.id && obj[attr] && typeof obj[attr] === 'string') {
              obj[attr] = new Date(obj[attr]);
            }
          });
          callback(null, obj);
        } else {
          callback();
        }
      });
    } else {
      callback('notfound');
    }
  });
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
  redisclient.info(callback);
};

//
module.exports.del = function(namespace, id, callback) {
  var k = namespace+'/'+id;
  // remove from redis
  redisclient.del(k, callback);
};

//
module.exports.flushall = function(callback) {
  redisclient.flushall(callback);
  winston.info('Cache flush');
};
