
const _           = require('lodash');
const redis       = require('redis');

const logger      = require('./logger');
const config      = require('./config');

let options       = null;
let client        = null;


// init cache module : create redis client
module.exports.init = async () => {
  options = config.redis || {};
  client = redis.createClient(options);

  client.on('error', (err) => { logger.error(err); });

  await client.connect();

  if (config.env === 'test') {
    module.exports.flushall();
  }
};

//
module.exports.put = (namespace, id, value, callback, timeout) => {
  const k = namespace + '/' + id;
  const v = serialize(value);

  // console.log('PUT: ' + k);
  client.set(k, v).then((value) => {
    if (callback) {
      callback(null, value);
    }
    if (timeout || options.timeout) {
      client.expire(k, timeout || options.timeout).then();
    }
  });
};

//
module.exports.get = (namespace, id, callback) => {
  const k = namespace + '/' + id;
  client.get(k).then((value) => {
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
  client.info().then((info) => {
    callback(null, info);
    logger.info('Cache flush');
  });
};

//
module.exports.incr = async (namespace, id) => {
  const k = [namespace, id].join('/');
  await client.INCR(k);
};

//
module.exports.del = async (namespace, id, callback) => {
  const k = [namespace, id].join('/');
  // remove from redis
  await client.del(k);
  callback();
};

//
module.exports.flushall = async (callback) => {
  await client.FLUSHDB('ASYNC');
  logger.info('Cache flushed');
  if (callback) {
    callback();
  }
};

// scan keys
// - fn is invoked with (key, callback) for each key matching the pattern
module.exports.scan = async (pattern, fn, callback) => {
  for await (const key of client.scanIterator({ MATCH: pattern })) {
    // use the key!
    await new Promise((resolve) => {
      fn(key, resolve);
    });
  }  
  if (callback) {
    callback();
  }
};

// flush with wildcard
module.exports.flush = (pattern) => {
  module.exports.scan(pattern, async (key, callback) => {
    // console.log('DEL: ' + key);
    await client.DEL(key);
    callback();
  });
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
