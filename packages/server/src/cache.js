
const v8          = require('v8');
const redis       = require('redis');

const logger      = require('./logger');
const config      = require('./config');

let options       = null;
let client        = null;
let buffers       = null;


const key = (namespace, id) => `${namespace}/${id}`;

// init cache module : create redis client
module.exports.init = async () => {
  if (client) {
    return;
  }
  options = config.redis || {};
  client = redis.createClient(options);

  client.on('error', (err) => { logger.error(err); });

  await client.connect();

  // reads go through a buffer-typed view of the same connection: values are binary
  buffers = client.withTypeMapping({ [redis.RESP_TYPES.BLOB_STRING]: Buffer });

  if (config.env === 'test') {
    await module.exports.flushall();
  }
};

//
module.exports.put = async (namespace, id, value, timeout) => {
  const k = key(namespace, id);
  const v = serialize(k, value);

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
  const value = await buffers.get(k);
  if (!value) {
    return value;
  }
  // found obj in redis
  return deserialize(value);
};

// - returns values for several ids of the same namespace, in the same order
// - missing (or unreadable) keys are returned as 0
module.exports.mget = async (namespace, ids) => {
  if (!ids.length) {
    return [];
  }
  const values = await buffers.mGet(ids.map(id => key(namespace, id)));
  return values.map(value => {
    const v = value ? deserialize(value) : null;
    return v === null ? 0 : v;
  });
};

// - returns object from cache if exists.
// - calls func(id) otherwise and put result in cache
module.exports.fetch = async (namespace, id, func, timeout) => {

  const obj = await module.exports.get(namespace, id);

  // if found in cache, return it (falsy values like 0, '' or false are valid hits)
  if (obj !== null && obj !== undefined) {
    return obj;
  }

  // invoke
  const result = await func(id);
  if (result !== null && result !== undefined && !result.err) {
    // put in cache and return result obj
    await module.exports.put(namespace, id, result, timeout);
  }
  return result;
};

//
module.exports.info = async () => {
  return await client.info();
};

// no expiration here on purpose: if a version key disappears, it restarts at 0
// and revalidates the stale entries stamped with version 0
module.exports.incr = async (namespace, id) => {
  const k = key(namespace, id);
  return await client.incr(k);
};

// same: no expiration
module.exports.incrby = async (namespace, id, value) => {
  const k = key(namespace, id);
  return await client.incrBy(k, value);
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

// v8 structured clone: Date, Buffer, Map, Set and falsy values keep their type,
// so there is nothing to revive on the way out
const serialize = (k, value) => {
  try {
    return v8.serialize(value);
  } catch (err) {
    // the rebuild is the slow path on purpose: nothing is cloned twice when it serializes
    logger.warn(`Cache "${k}": ${err.message} Storing the value without it.`);
    return v8.serialize(cloneable(value));
  }
};

// every v8.serialize() payload starts with 0xFF followed by the format version
const V8_HEADER   = v8.serialize(null).subarray(0, 2);
const INTEGER     = /^-?\d+$/;

//
const deserialize = (buffer) => {
  if (buffer[0] === V8_HEADER[0]) {
    // a payload written by another node major would throw on deserialize: miss instead
    return buffer[1] === V8_HEADER[1] ? v8.deserialize(buffer) : null;
  }
  const data = buffer.toString();
  if (INTEGER.test(data)) {
    return Number(data); // counter written by incr/incrby
  }
  // entry written by an older release (JSON): treat as a miss rather than
  // serve it with dates and buffers degraded to strings
  return null;
};

// drops what the serializer refuses (functions, class refs, Proxies) instead of failing.
// structuredClone is the algorithm v8.serialize implements, so it answers for it
const cloneable = (value, seen = new WeakSet()) => {
  try {
    structuredClone(value);
    return value;
  } catch (_err) {
    // rebuild below, keeping what can be cloned
  }

  if (value === null || typeof value !== 'object') {
    return undefined; // a function, a symbol: nothing to keep
  }
  if (seen.has(value)) {
    return undefined; // cycle running through a branch that cannot be cloned
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map(item => cloneable(item, seen));
  }
  return Object.keys(value).reduce((kept, k) => {
    const clone = cloneable(value[k], seen);
    if (clone !== undefined) {
      kept[k] = clone;
    }
    return kept;
  }, {});
};

