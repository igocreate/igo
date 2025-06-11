
const _           = require('lodash');
const redis       = require('redis');

const logger      = require('./logger');
const config      = require('./config');

let options       = null;
let client        = null;


const key = (namespace, id) => `${namespace}/${id}`;

// init cache module : create redis client
module.exports.init = async () => {
  options = config.redis || {};
  client = redis.createClient(options);

  client.on('error', (err) => { logger.error(err); });

  await client.connect();

  if (config.env === 'test') {
    await module.exports.flushall();
  }
};

//
module.exports.put = async (namespace, id, value, timeout) => {
  const k = key(namespace, id);
  const v = serialize(value);

  // console.log('PUT: ' + k);
  const ret = await client.set(k, v);
  if (timeout || options.timeout) {
    await client.expire(k, timeout || options.timeout);
  }
  return ret;
};

//
module.exports.get = async (namespace, id) => {
  const k = key(namespace, id);
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

  // if found in cache, return it
  if (obj) {
    return obj;
  }

  // invoke
  const result = await func(id);
  if (result && !result.err) {
    // put in cache and return result obj
    await module.exports.put(namespace, id, result, timeout);
  }
  return result;
};

//
module.exports.info = async () => {
  return await client.info();
};

//
module.exports.incr = async (namespace, id) => {
  const k = key(namespace, id);
  return await client.incr(k);
};

//
module.exports.del = async (namespace, id) => {
  const k = key(namespace, id);
  // remove from redis
  return await client.del(k);
};

//
module.exports.flushdb = async () => {
  const r = await client.flushDb();
  logger.info('Cache flushDb: ' + r);
};

//
module.exports.flushall = async () => {
  const r = await client.flushAll();
  logger.info('Cache flushAll: ' + r);
};

// scan keys
// - fn is invoked with (key) parameter for each key matching the pattern
module.exports.scan = async (pattern, fn) => {
  let cursor = '0';

  do {
    const result = await client.scan(cursor, {
      MATCH: pattern,
      COUNT: 100,
    });

    cursor = result.cursor;
    const keys = result.keys;

    for (const key of keys) {
      await fn(key);
    }
  } while (cursor !== '0');
};

// flush with wildcard
module.exports.flush = async (pattern) => {
  await module.exports.scan(pattern, async (key) => {
    // console.log('DEL: ' + key);
    await client.del(key);
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
