
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
module.exports.put = async (namespace, id, value, timeout) => {
  const k = namespace + '/' + id;
  const v = serialize(value);

  // console.log('PUT: ' + k);
  const ret = await client.set(k, v);
  if (timeout || options.timeout) {
    client.expire(k, timeout || options.timeout);
  }
  return ret;
};

//
module.exports.get = async (namespace, id) => {
  const k = namespace + '/' + id;
  const value = await client.get(k);
  if (!value) {
    return value;
  }
  // found obj in redis
  return deserialize(value);
};

// - returns object from cache if exists.
// - calls func(id) otherwise and put result in cache
module.exports.fetch = async (namespace, id, func, timeout) => {

  const obj = await module.exports.get(namespace, id);
  
  if (obj) {
    return obj;
  }

  // invoke
  // console.log(namespace + '/' + id + ' not found in cache');
  const result = await func(id);
  if (result && !result.err) {
    // put in cache and return result obj
    await module.exports.put(namespace, id, result, timeout);
  }
  return result;
};

//
module.exports.info = async () => {
  return client.info();
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
module.exports.scan = async (pattern, fn) => {
  for await (const key of client.scanIterator({ MATCH: pattern })) {
    // use the key!
    await fn(key);
  }  
};

// flush with wildcard
module.exports.flush = (pattern) => {
  module.exports.scan(pattern, async (key) => {
    // console.log('DEL: ' + key);
    await client.DEL(key);
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
