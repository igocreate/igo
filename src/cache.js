
const _           = require('lodash');
const redis       = require('redis');

const cls         = require('./cls');
const logger      = require('./logger');

let options       = null;
let redisclient   = null;

const retryStrategy = function(params) {
  if (params.error.code === 'ECONNREFUSED') {
    logger.error('Redis connection refused on host ' + options.host + ':' + options.port);
    return params.error;
  }
  logger.error('Redis error ' + params.error);
  // retry in n seconds
  return params.attempt * 1000;
};

//
const serialize = function(value) {
  if (_.isBuffer(value)) {
    return JSON.stringify({ buffer: value.toString('base64') });
  }
  return JSON.stringify({ v: value });
}

//
const deserialize = function(data) {
  const obj = JSON.parse(data);
  if (obj.buffer) {
    return Buffer.from(obj.buffer, 'base64');
  }
  if (obj.v !== undefined) { // can be null
    deserializeDates(obj);
    return obj.v;
  }
  return obj;
}

// init cache module : create redis client
module.exports.init = function(config) {
  config      = config || {};
  options     = config.redis || {};

  options     = _.defaultsDeep(options, {
    timeout:        null,  // no timeout by default
    no_ready_check: true,
    retry_strategy: retryStrategy
  });

  redisclient = redis.createClient(options);
  if (options.password) {
    redisclient.auth(options.password);
  }
  redisclient.select(options.database || 0);
  redisclient.on('error', function (err) {
    // logger.error('' + err);
  });

  if (config.env !== 'production' && options.flushonrestart !== false) {
    module.exports.flushall();
  }
};

//
module.exports.redisclient = function() {
  return redisclient;
};

//
module.exports.put = function(namespace, id, value, callback, timeout) {
  const k = namespace + '/' + id;
  const v = serialize(value);

  redisclient.set(k, v, cls.bind(function(err) {
    if (callback) {
      callback(null, value);
    }
    if (timeout || options.timeout) {
      redisclient.expire(k, timeout || options.timeout);
    }
  }));
};

//
module.exports.get = function(namespace, id, callback) {

  const k = namespace + '/' + id;
  redisclient.get(k, cls.bind(function(err, value) {
    if (!value) {
      return callback('notfound');
    }
    // found obj in redis
    const obj = deserialize(value);
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
        if (!err) {
          // put in cache and return result obj
          module.exports.put(namespace, id, result);
        }
        callback(err, result);
      });
    } else {
      callback(err, obj);
    }
  });
};

// retro compatibility
module.exports.getput = function(namespace, id, func, callback) {
  console.warn('IGO: cache.getput() is deprecated, use cache.fetch() instead.');
  module.exports.fetch(namespace, id, func, callback);
};

//
module.exports.info = function(callback) {
  redisclient.info(cls.bind(callback));
};

//
module.exports.del = function(namespace, id, callback) {
  const k = namespace+'/'+id;
  // remove from redis
  redisclient.del(k, cls.bind(callback));
};

//
module.exports.flushall = function(callback) {
  redisclient.flushall(cls.bind(callback));
  logger.info('Cache flush');
};


const  DATE_REGEXP = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/;
const deserializeDates = function(obj) {
  if (_.isString(obj) && obj.match(DATE_REGEXP)) {
    return new Date(obj);
  } else if (_.isObject(obj) && _.keys(obj).length > 0) {
    _.forIn(obj, function(value, key) {
      obj[key] = deserializeDates(value);
    });
  }
  return obj;
};
