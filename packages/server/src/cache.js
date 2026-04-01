
const _           = require('lodash');
const redis       = require('redis');

const logger      = require('./logger');
const config      = require('./config');

let options       = null;
let client        = null;


const key = (namespace, id) => `${namespace}/${id}`;

/**
 * Initialize the cache module with Redis client
 * @returns {Promise<void>}
 * @throws {Error} If Redis connection fails
 */
module.exports.init = async () => {
  options = config.redis || {};
  client = redis.createClient(options);

  client.on('error', (err) => { 
    // In test mode, just log the error and continue
    if (config.env === 'test') {
      logger.debug('Redis error (ignored in test):', err.message);
    } else {
      logger.error('Redis error:', err); 
    }
  });

  client.on('reconnecting', () => {
    logger.info('Redis reconnecting...');
  });

  client.on('ready', () => {
    logger.debug('Redis connection ready');
  });

  try {
    await client.connect();
  } catch (err) {
    if (config.env === 'test') {
      // In test mode, allow tests to continue without Redis
      logger.warn('Redis connection failed in test mode - cache operations will be skipped');
      client = null;
      return;
    }
    throw err;
  }

  if (config.env === 'test' && client) {
    await module.exports.flushall();
  }
};

/**
 * Store a value in cache
 * @param {string} namespace - Cache namespace
 * @param {string} id - Cache key identifier
 * @param {*} value - Value to cache (will be serialized)
 * @param {number} [timeout] - Optional expiration timeout in seconds
 * @returns {Promise<string>} Redis response
 */
module.exports.put = async (namespace, id, value, timeout) => {
  if (!client) return null;
  
  const k = key(namespace, id);
  const v = serialize(value);

  // console.log('PUT: ' + k);
  const ret = await client.set(k, v);
  if (timeout || options.timeout) {
    await client.expire(k, timeout || options.timeout);
  }
  return ret;
};

/**
 * Retrieve a value from cache
 * @param {string} namespace - Cache namespace
 * @param {string} id - Cache key identifier
 * @returns {Promise<*|null>} Cached value or null if not found
 */
module.exports.get = async (namespace, id) => {
  if (!client) return null;
  
  const k = key(namespace, id);
  const value = await client.get(k);
  if (!value) {
    return value;
  }
  // found obj in redis
  return deserialize(value);
};

/**
 * Fetch from cache or compute and store
 * Returns cached value if exists, otherwise calls func(id) and caches result
 * @param {string} namespace - Cache namespace
 * @param {string} id - Cache key identifier
 * @param {Function} func - Function to call if cache miss: (id) => Promise<value>
 * @param {number} [timeout] - Optional expiration timeout in seconds
 * @returns {Promise<*>} Cached or computed value
 */
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
  if (!client) return null;
  return await client.info();
};

//
module.exports.incr = async (namespace, id) => {
  if (!client) return 0;
  const k = key(namespace, id);
  return await client.incr(k);
};

//
module.exports.del = async (namespace, id) => {
  if (!client) return null;
  const k = key(namespace, id);
  // remove from redis
  return await client.del(k);
};

//
module.exports.flushdb = async () => {
  if (!client) return;
  const r = await client.flushDb();
  logger.info('Cache flushDb: ' + r);
};

//
module.exports.flushall = async () => {
  if (!client) return;
  const r = await client.flushAll();
  logger.info('Cache flushAll: ' + r);
};

// scan keys
// - fn is invoked with (key) parameter for each key matching the pattern
module.exports.scan = async (pattern, fn) => {
  if (!client) return;
  
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
  if (!client) return;
  await module.exports.scan(pattern, async (key) => {
    // console.log('DEL: ' + key);
    await client.del(key);
  });
};

// get cache statistics
module.exports.getStats = async () => {
  if (!client || !client.isReady) {
    return { connected: false };
  }
  
  const info = await client.info();
  const dbSize = await client.dbSize();
  
  return {
    connected: client.isReady,
    keys: dbSize,
    info: info
  };
};

// disconnect redis client
module.exports.disconnect = async () => {
  if (client && client.isReady) {
    await client.quit();
    logger.info('Redis connection closed');
  }
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
