
const _               = require('lodash');
const { randomUUID }  = require('crypto');

const cache           = require('../cache');
const logger          = require('../logger');
const utils           = require('../utils');

const NS              = 'cacheflash';
const SIZE_THRESHOLD  = 1024;  // 1KB - auto switch to cacheflash
const SIZE_WARNING    = 10240; // 10KB - log warning

//
module.exports = async (req, res, next) => {

  const cacheflash  = req.session._igo_cacheflash || [];
  res.locals.flash  = req.session.flash || {};

  // a GET consumes the flash scope; other requests add to the one they display
  const isGet   = req.method === 'GET';
  const scope   = isGet ? {} : res.locals.flash;
  const pending = isGet ? [] : cacheflash;
  if (isGet) {
    // empty scopes are not stored: a mere visit must not start a session
    delete req.session.flash;
    delete req.session._igo_cacheflash;
  }

  // save flash data in session
  req.flash = (key, value) => {
    const json = utils.toJSON(value);
    const size = json ? json.length : 0;

    // Auto-switch to cacheflash if object is too large, or if JSON cannot express it
    // (a cycle): the session is stored as JSON
    if (json === null || size > SIZE_THRESHOLD) {
      if (size > SIZE_WARNING) {
        logger.warn(`Flash object "${key}" is very large (${(size/1024).toFixed(1)}KB), automatically using cacheflash. Consider reducing data size.`);
      }
      return req.cacheflash(key, value);
    }

    scope[key]        = value;
    req.session.flash = scope;
  };

  // save flash data in redis
  req.cacheflash = (key, value) => {
    // the value landed here because the session cookie cannot hold it: there is nowhere else
    if (!cache.isAvailable()) {
      logger.warn(`Flash "${key}" dropped: the cache is unavailable and the value does not fit in the session`);
      return;
    }
    const uuid = randomUUID();
    pending.push(uuid);
    req.session._igo_cacheflash = pending;
    return cache.put(NS, uuid, { [key]: value }, 60); // 60s
  };

  // Load cacheflash objects in parallel
  if (cacheflash.length) {
    const objects = await Promise.all(
      cacheflash.map(uuid => cache.get(NS, uuid))
    );
    objects.forEach(obj => _.merge(res.locals.flash, obj));
  }

  next();

};
