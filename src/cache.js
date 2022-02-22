
const _           = require('lodash');
const async       = require('async');
const redis       = require('redis');

const logger      = require('./logger');
const config      = require('./config');

let options       = null;
let redisclient   = null;

const retryStrategy = (params) => {
  if (params.error.code === 'ECONNREFUSED') {
    logger.error('Redis connection refused on host ' + options.host + ':' + options.port);
    return params.error;
  }
  logger.error('Redis error ' + params.error);
  // retry in n seconds
  return params.attempt * 1000;
};

//
const serialize = (value) => {
  if (_.isBuffer(value)) {
    return JSON.stringify({ buffer: value.toString('base64') });
  }
  return JSON.stringify({ v: value });
};

//
const deserialize = (data) => {
  const obj = JSON.parse(data);
  if (obj.buffer) {
    return Buffer.from(obj.buffer, 'base64');
  }
  if (obj.v !== undefined) { // can be null
    deserializeDates(obj);
    return obj.v;
  }
  return obj;
};

// init cache module : create redis client
module.exports.init = () => {
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
  redisclient.on('error', (err) => {
    logger.error(err);
  });

  if (config.env === 'test') {
    module.exports.flushall();
  }
};

//
module.exports.redisclient = () => {
  return redisclient;
};

//
module.exports.put = (namespace, id, value, callback, timeout) => {
  const k = namespace + '/' + id;
  const v = serialize(value);

  // console.log('PUT: ' + k);
  redisclient.set(k, v, (err) => {
    if (callback) {
      callback(err, value);
    }
    if (timeout || options.timeout) {
      redisclient.expire(k, timeout || options.timeout);
    }
  });
};

//
module.exports.get = (namespace, id, callback) => {
  const k = namespace + '/' + id;
  redisclient.get(k, (err, value) => {
    if (!value) {
      return callback('notfound');
    }
    // found obj in redis
    const obj = deserialize(value);
    callback(null, obj);
  });
};

// - returns object from cache if exists.
// - calls func(id, callback) otherwise and put result in cache
module.exports.fetch = (namespace, id, func, callback, timeout) => {

  module.exports.get(namespace, id, (err, obj) => {
    if (err !== 'notfound') {
      // console.log(namespace + '/' + id + ' found in cache');
      return callback(err, obj);
    }

    // invoke
    // console.log(namespace + '/' + id + ' not found in cache');
    func(id, (err, result) => {
      if (!err) {
        // put in cache and return result obj
        module.exports.put(namespace, id, result, null, timeout);
      }
      callback(err, result);
    });
  });
};

//
module.exports.info = (callback) => {
  redisclient.info(callback);
};

//
module.exports.incr = (namespace, id) => {
  const k = namespace+'/'+id;
  redisclient.incr(k);
};

//
module.exports.del = (namespace, id, callback) => {
  const k = namespace+'/'+id;
  // remove from redis
  redisclient.del(k, callback);
};

//
module.exports.flushall = (callback) => {
  redisclient.flushall(callback);
  logger.info('Cache flush');
};

// scan keys
// - fn is invoked with (key, callback)
module.exports.scan = (pattern, fn, callback) => {
  let cursor = '0';

  const scan = () => {
    redisclient.scan(cursor, 'MATCH', pattern, 'COUNT', '1', (err, res) => {
      cursor = res[0];
      async.eachSeries(res[1], fn, () => {
        if (cursor === '0') {
          // done
          if (callback) {
            callback();
          }
          return;
        }
        // recursive scan
        scan();
      });
    });
  };

  scan();
};

// flush with wildcard
module.exports.flush = (pattern) => {
  module.exports.scan(pattern, (key, callback) => {
    // console.log('DEL: ' + key);
    redisclient.del(key, callback);
  });
};

const  DATE_REGEXP = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/;
const deserializeDates = (obj) => {
  if (_.isString(obj) && obj.match(DATE_REGEXP)) {
    return new Date(obj);
  } else if (_.isObject(obj) && _.keys(obj).length > 0) {
    _.forIn(obj, (value, key) => {
      obj[key] = deserializeDates(value);
    });
  }
  return obj;
};
