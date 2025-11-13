
const _               = require('lodash');
const { randomUUID }  = require('crypto');

const cache           = require('../cache');
const logger          = require('../logger');

const NS              = 'cacheflash';
const SIZE_THRESHOLD  = 1024;  // 1KB - auto switch to cacheflash
const SIZE_WARNING    = 10240; // 10KB - log warning

//
module.exports = async (req, res, next) => {

  req.session.flash             = req.session.flash || {};
  res.locals.flash              = req.session.flash;

  req.session._igo_cacheflash   = req.session._igo_cacheflash || [];
  const cacheflash              = req.session._igo_cacheflash;

  if (req.method === 'GET') {
    // clear flash scope
    req.session.flash             = {};
    req.session._igo_cacheflash   = [];
  }

  // save flash data in session
  req.flash = (key, value) => {
    const size = value !== undefined ? JSON.stringify(value).length : 0;

    // Auto-switch to cacheflash if object is too large
    if (size > SIZE_THRESHOLD) {
      if (size > SIZE_WARNING) {
        logger.warn(`Flash object "${key}" is very large (${(size/1024).toFixed(1)}KB), automatically using cacheflash. Consider reducing data size.`);
      }
      return req.cacheflash(key, value);
    }

    req.session.flash[key] = value;
  };

  // save flash data in redis
  req.cacheflash = (key, value) => {
    const uuid = randomUUID();
    req.session._igo_cacheflash.push(uuid);
    cache.put(NS, uuid, { [key]: value }, 60); // 60s
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
