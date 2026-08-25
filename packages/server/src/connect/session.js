
const crypto    = require('crypto');
const Cookies   = require('cookies');
const onHeaders = require('on-headers');

// encrypted cookie format: "1.<base64url(iv|tag|ciphertext)>"
const VERSION     = '1';
const ALGORITHM   = 'aes-256-gcm';
const IV_LENGTH   = 12;
const TAG_LENGTH  = 16;
const HKDF_SALT   = 'igo-session';
const HKDF_INFO   = 'igo-session-encryption';

const derivedKeys = new Map();

//
const derive = function(key) {
  if (!derivedKeys.has(key)) {
    derivedKeys.set(key, Buffer.from(crypto.hkdfSync('sha256', key, HKDF_SALT, HKDF_INFO, 32)));
  }
  return derivedKeys.get(key);
};

// payload: { d: session, e: absolute expiry } - the browser is not trusted to honor maxAge
const encrypt = function(obj, key, maxAge) {
  const payload = maxAge ? { d: obj, e: Date.now() + maxAge } : { d: obj };
  const iv      = crypto.randomBytes(IV_LENGTH);
  const cipher  = crypto.createCipheriv(ALGORITHM, key, iv);
  const data    = Buffer.concat([ cipher.update(JSON.stringify(payload), 'utf8'), cipher.final() ]);
  return VERSION + '.' + Buffer.concat([ iv, cipher.getAuthTag(), data ]).toString('base64url');
};

//
const decrypt = function(value, keys) {
  const buffer = Buffer.from(value.slice(VERSION.length + 1), 'base64url');
  if (buffer.length <= IV_LENGTH + TAG_LENGTH) {
    return null;
  }
  const iv    = buffer.subarray(0, IV_LENGTH);
  const tag   = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const data  = buffer.subarray(IV_LENGTH + TAG_LENGTH);

  for (const key of keys) {
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      const json    = decipher.update(data, undefined, 'utf8') + decipher.final('utf8');
      const payload = JSON.parse(json);
      if (payload.e && payload.e < Date.now()) {
        return null;
      }
      if (payload.d && typeof payload.d === 'object') {
        return payload.d;
      }
    } catch (_err) {
      // wrong key or tampered cookie: try next key
    }
  }
  return null;
};

//
module.exports = function session(options) {

  const opts = Object.assign({
    name:       'session',
    httpOnly:   true,
    overwrite:  true,
  }, options);

  const keys = opts.keys || (opts.secret ? [ opts.secret ] : null);
  if (!keys || !keys.length) {
    throw new Error('.keys required.');
  }
  const cryptoKeys = keys.map(derive);

  return function _session(req, res, next) {

    const cookies = new Cookies(req, res);

    let sess    = undefined;  // undefined: not accessed, false: destroyed
    let isNew   = true;
    let initial = undefined;  // json of the session as loaded

    const load = function() {
      const value = cookies.get(opts.name);
      if (!value || !value.startsWith(VERSION + '.')) {
        return null;
      }
      return decrypt(value, cryptoKeys);
    };

    Object.defineProperty(req, 'session', {
      configurable: true,
      enumerable:   true,
      get: function() {
        if (sess !== undefined) {
          return sess === false ? null : sess;
        }
        const obj = load();
        isNew     = !obj;
        initial   = obj ? JSON.stringify(obj) : undefined;
        sess      = obj || {};
        return sess;
      },
      set: function(value) {
        if (value === null || value === undefined) {
          sess = false;
          return;
        }
        if (typeof value !== 'object') {
          throw new Error('req.session can only be set as null or an object.');
        }
        isNew   = true;
        initial = undefined;
        sess    = value;
      }
    });

    onHeaders(res, function() {
      if (sess === undefined) {
        return;
      }
      if (sess === false) {
        cookies.set(opts.name, '', opts);
        return;
      }
      const json = JSON.stringify(sess);
      if (isNew && json === '{}') {
        return;
      }
      if (json === initial) {
        return;
      }
      cookies.set(opts.name, encrypt(sess, cryptoKeys[0], opts.maxAge), opts);
    });

    next();
  };
};
