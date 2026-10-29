
const crypto    = require('crypto');
const Cookies   = require('cookies');
const onHeaders = require('on-headers');

const logger    = require('../logger');

// encrypted cookie format: "1.<base64url(iv|tag|ciphertext)>"
const VERSION     = '1';
const ALGORITHM   = 'aes-256-gcm';
const IV_LENGTH   = 12;
const TAG_LENGTH  = 16;
const HKDF_SALT   = 'igo-session';
const HKDF_INFO   = 'igo-session-encryption';
// an unchanged session is rewritten at most this often to push back its idleTimeout
const ROLLING_INTERVAL = 60 * 1000;

const derivedKeys = new Map();

//
const derive = function(key) {
  if (!derivedKeys.has(key)) {
    derivedKeys.set(key, Buffer.from(crypto.hkdfSync('sha256', key, HKDF_SALT, HKDF_INFO, 32)));
  }
  return derivedKeys.get(key);
};

// start: session start, checked against maxDuration; written: last write, checked against idleTimeout
// (in the payload: the browser is not trusted to honor them)
const encrypt = function(session, key, start, written) {
  const payload = { session, start, written };
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
      // { d: session, e: absolute expiry }: written by igo <= 6.5
      if (payload.e && payload.e < Date.now()) {
        return null;
      }
      const session = payload.session || payload.d;
      if (session && typeof session === 'object') {
        return { session, start: payload.start, written: payload.written };
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

  // maxAge: counted from the last change before igo 6.6, now an alias of maxDuration
  if (opts.maxAge !== undefined) {
    logger.warn('config.cookieSession.maxAge is deprecated and now means maxDuration: rename it');
  }
  const maxDuration = opts.maxAge ?? opts.maxDuration;

  // checked against the current options, so lowering them applies to cookies already out
  const expired = function(payload, now) {
    const { start, written } = payload;
    if (opts.idleTimeout && written && written + opts.idleTimeout <= now) {
      return true;
    }
    return !!(maxDuration && start && start + maxDuration <= now);
  };

  return function _session(req, res, next) {

    const cookies = new Cookies(req, res);

    let session = undefined;  // undefined: not accessed, false: destroyed
    let isNew   = true;
    let initial = undefined;  // json of the session as loaded
    let start   = undefined;  // when the session started
    let written = undefined;  // when the cookie was last written

    const load = function() {
      const header = req.headers.cookie;
      if (!header) {
        return null;
      }
      const re = new RegExp('(?:^|;)\\s*' + opts.name + '=([^;]*)', 'g');
      let match;
      while ((match = re.exec(header))) {
        const value = match[1];
        if (value && value.startsWith(VERSION + '.')) {
          const payload = decrypt(value, cryptoKeys);
          if (payload && !expired(payload, Date.now())) {
            return payload;
          }
        }
      }
      return null;
    };

    // req.session.restart(): the session's timeouts start over, its data stays - to call on sign-in
    const restart = function() {
      start   = Date.now();
      written = undefined;
      initial = undefined;
    };
    // non-enumerable, so it stays out of the cookie and of the session's keys
    const withRestart = function(obj) {
      return Object.defineProperty(obj, 'restart', { configurable: true, value: restart });
    };

    Object.defineProperty(req, 'session', {
      configurable: true,
      enumerable:   true,
      get: function() {
        if (session !== undefined) {
          return session === false ? null : session;
        }
        const payload = load();
        isNew   = !payload;
        initial = payload ? JSON.stringify(payload.session) : undefined;
        // cookies written by igo <= 6.5 have no start: counted from now
        start   = payload?.start || Date.now();
        written = payload?.written;
        session = withRestart(payload ? payload.session : {});
        return session;
      },
      set: function(value) {
        if (value === null || value === undefined) {
          session = false;
          return;
        }
        if (typeof value !== 'object') {
          throw new Error('req.session can only be set as null or an object.');
        }
        isNew   = true;
        initial = undefined;
        start   = Date.now();
        written = undefined;
        session = withRestart(value);
      }
    });

    onHeaders(res, function() {
      if (session === undefined) {
        return;
      }
      if (session === false) {
        cookies.set(opts.name, '', opts);
        return;
      }
      const json = JSON.stringify(session);
      if (isNew && json === '{}') {
        return;
      }
      const now     = Date.now();
      // only idleTimeout renews an unchanged session; maxDuration needs the start of an igo <= 6.5 cookie written
      const renew = opts.idleTimeout ? !written || now - written >= ROLLING_INTERVAL : maxDuration && !written;
      if (json === initial && !renew) {
        return;
      }
      const ttls   = [ opts.idleTimeout, maxDuration && start + maxDuration - now ].filter(Boolean);
      const maxAge = ttls.length ? Math.min(...ttls) : undefined;
      cookies.set(opts.name, encrypt(session, cryptoKeys[0], start, now), Object.assign({}, opts, { maxAge }));
    });

    next();
  };
};
