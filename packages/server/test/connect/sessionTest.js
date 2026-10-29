require('../init');

const assert  = require('assert');
const crypto  = require('crypto');
const http    = require('http');
const Keygrip = require('keygrip');

const session = require('../../src/connect/session');


const KEYS = [ 'key-one', 'key-two' ];

//
const run = function(middleware, cookieHeader) {
  const req = { headers: cookieHeader ? { cookie: cookieHeader } : {}, socket: {} };
  const res = new http.ServerResponse(req);
  let done   = null;
  middleware(req, res, () => { done = true; });
  assert.strictEqual(done, true);
  return { req, res };
};

//
const setCookies = function(res) {
  res.writeHead(200);
  const header = res.getHeader('Set-Cookie') || [];
  return (Array.isArray(header) ? header : [ header ]);
};

//
const cookieValue = function(cookies, name) {
  const cookie = cookies.find(c => c.startsWith(name + '='));
  return cookie ? cookie.slice(name.length + 1).split(';')[0] : null;
};

//
const legacyCookie = function(name, obj, keys) {
  const value = Buffer.from(JSON.stringify(obj)).toString('base64');
  const sig   = new Keygrip(keys).sign(name + '=' + value);
  return `${name}=${value}; ${name}.sig=${sig}`;
};


describe('Session middleware', () => {

  const middleware = session({ name: 'app', keys: KEYS, maxDuration: 60000 });

  it('should require keys', () => {
    assert.throws(() => session({ name: 'app' }), /keys required/);
  });

  it('should start with an empty session', () => {
    const { req, res } = run(middleware);
    assert.deepStrictEqual(req.session, {});
    assert.deepStrictEqual(setCookies(res), []);
  });

  it('should encrypt the session in the cookie', () => {
    const { req, res } = run(middleware);
    req.session.user_id = 42;
    req.session.role    = 'admin';

    const value = cookieValue(setCookies(res), 'app');
    assert(value.startsWith('1.'));
    assert(!value.includes('admin'));
    assert(!Buffer.from(value.slice(2), 'base64url').toString('utf8').includes('admin'));
  });

  it('should read back its own cookie', () => {
    const first = run(middleware);
    first.req.session.user_id = 42;
    const cookies = setCookies(first.res);

    const { req } = run(middleware, cookies.join('; '));
    assert.deepStrictEqual(req.session, { user_id: 42 });
  });

  it('should not rewrite an unchanged session', () => {
    const first = run(middleware);
    first.req.session.user_id = 42;
    const cookies = setCookies(first.res);

    const second = run(middleware, cookies.join('; '));
    assert.strictEqual(second.req.session.user_id, 42);
    assert.deepStrictEqual(setCookies(second.res), []);
  });

  it('should not sign the cookie', () => {
    const { req, res } = run(middleware);
    req.session.user_id = 42;
    assert.strictEqual(cookieValue(setCookies(res), 'app.sig'), null);
  });

  it('should ignore a tampered cookie', () => {
    const first = run(middleware);
    first.req.session.user_id = 42;
    const value   = cookieValue(setCookies(first.res), 'app');
    const tampered = value.slice(0, -4) + 'AAAA';

    const { req } = run(middleware, 'app=' + tampered);
    assert.deepStrictEqual(req.session, {});
  });

  it('should ignore a cookie encrypted with another key', () => {
    const other = session({ name: 'app', keys: [ 'another-key' ] });
    const first = run(other);
    first.req.session.user_id = 42;

    const { req } = run(middleware, setCookies(first.res).join('; '));
    assert.deepStrictEqual(req.session, {});
  });

  it('should support key rotation', () => {
    const previous = session({ name: 'app', keys: [ KEYS[1] ] });
    const first    = run(previous);
    first.req.session.user_id = 42;

    const { req } = run(middleware, setCookies(first.res).join('; '));
    assert.deepStrictEqual(req.session, { user_id: 42 });
  });

  it('should destroy the session when set to null', () => {
    const first = run(middleware);
    first.req.session.user_id = 42;
    const cookies = setCookies(first.res);

    const second = run(middleware, cookies.join('; '));
    second.req.session = null;
    assert.strictEqual(second.req.session, null);

    const cookie = setCookies(second.res).find(c => c.startsWith('app='));
    assert(cookie.includes('expires=Thu, 01 Jan 1970'));
  });

  it('should replace the session when set to an object', () => {
    const first = run(middleware);
    first.req.session.user_id = 42;
    const cookies = setCookies(first.res);

    const second = run(middleware, cookies.join('; '));
    second.req.session = { user_id: 43 };

    const { req } = run(middleware, setCookies(second.res).join('; '));
    assert.deepStrictEqual(req.session, { user_id: 43 });
  });

  it('should reject an expired session', () => {
    const expired = session({ name: 'app', keys: KEYS, maxDuration: -1000 });
    const first   = run(expired);
    first.req.session.user_id = 42;

    const { req } = run(expired, setCookies(first.res).join('; '));
    assert.deepStrictEqual(req.session, {});
  });

  it('should not expire without maxDuration', () => {
    const forever = session({ name: 'app', keys: KEYS });
    const first   = run(forever);
    first.req.session.user_id = 42;

    const { req } = run(forever, setCookies(first.res).join('; '));
    assert.deepStrictEqual(req.session, { user_id: 42 });
  });

  // sessions written by cookie-session (igo < 6.2) are not readable anymore, even signed
  it('should ignore an unencrypted cookie-session cookie', () => {
    const { req } = run(middleware, legacyCookie('app', { user_id: 42 }, KEYS));
    assert.deepStrictEqual(req.session, {});
  });

  it('should find the encrypted cookie when a legacy cookie with the same name comes first', () => {
    const first = run(middleware);
    first.req.session.user_id = 42;
    const encrypted = cookieValue(setCookies(first.res), 'app');

    const header = `app=legacybase64garbage; app=${encrypted}`;
    const { req } = run(middleware, header);
    assert.deepStrictEqual(req.session, { user_id: 42 });
  });

  describe('idle timeout and max duration', () => {

    const MINUTE  = 60 * 1000;
    const HOUR    = 60 * MINUTE;
    const timed   = session({ name: 'app', keys: KEYS, idleTimeout: HOUR, maxDuration: 24 * HOUR });
    const realNow = Date.now;
    let now;

    beforeEach(() => {
      now       = realNow();
      Date.now  = () => now;
    });

    afterEach(() => {
      Date.now = realNow;
    });

    const login = function() {
      const { req, res } = run(timed);
      req.session.user_id = 42;
      return setCookies(res).join('; ');
    };

    // one request: the session it saw, and the cookie the browser sends next
    const visit = function(cookie, fn) {
      const { req, res } = run(timed, cookie);
      const session = req.session;
      if (fn) {
        fn(req);
      }
      const set = setCookies(res);
      return { session, set, cookie: set.length ? set.join('; ') : cookie };
    };

    // a cookie written by igo <= 6.5: { d, e }, no start
    const oldCookie = function(obj, e) {
      const key     = Buffer.from(crypto.hkdfSync('sha256', KEYS[0], 'igo-session', 'igo-session-encryption', 32));
      const iv      = crypto.randomBytes(12);
      const cipher  = crypto.createCipheriv('aes-256-gcm', key, iv);
      const data    = Buffer.concat([ cipher.update(JSON.stringify({ d: obj, e }), 'utf8'), cipher.final() ]);
      return 'app=1.' + Buffer.concat([ iv, cipher.getAuthTag(), data ]).toString('base64url');
    };

    it('should expire after idleTimeout without activity', () => {
      const cookie = login();
      now += HOUR;
      assert.deepStrictEqual(visit(cookie).session, {});
    });

    it('should not renew an unchanged session more than once a minute', () => {
      const cookie = login();
      now += 30 * 1000;
      assert.deepStrictEqual(visit(cookie).set, []);
    });

    it('should push back the idle expiry on activity', () => {
      const first = login();
      now += 50 * MINUTE;
      const { cookie } = visit(first);
      assert.notStrictEqual(cookie, first);

      now += 50 * MINUTE;
      assert.deepStrictEqual(visit(cookie).session, { user_id: 42 });
      assert.deepStrictEqual(visit(first).session, {});
    });

    it('should expire after maxDuration despite activity', () => {
      let cookie = login();
      for (let i = 1; i < 48; i++) {
        now += 30 * MINUTE;
        const result = visit(cookie);
        assert.deepStrictEqual(result.session, { user_id: 42 });
        cookie = result.cookie;
      }
      now += 30 * MINUTE;
      assert.deepStrictEqual(visit(cookie).session, {});
    });

    it('should cap the cookie lifetime at maxDuration', () => {
      let cookie = login();
      for (let i = 1; i <= 47; i++) {
        now += 30 * MINUTE;
        cookie = visit(cookie).cookie;
      }
      const expires = /expires=([^;]+)/.exec(cookie)[1];
      assert(Math.abs(new Date(expires).getTime() - (now + 30 * MINUTE)) < 1000);
    });

    it('should restart the session when replaced', () => {
      let cookie = login();
      for (let i = 1; i <= 47; i++) {
        now += 30 * MINUTE;
        cookie = visit(cookie).cookie;
      }
      cookie = visit(cookie, req => {
        req.session = { ...req.session };
      }).cookie;
      now += 30 * MINUTE;
      assert.deepStrictEqual(visit(cookie).session, { user_id: 42 });
    });

    it('should restart the timeouts on restart(), keeping the data', () => {
      let cookie = login();
      for (let i = 1; i <= 47; i++) {
        now += 30 * MINUTE;
        cookie = visit(cookie).cookie;
      }
      cookie = visit(cookie, req => req.session.restart()).cookie;
      now += 30 * MINUTE;
      assert.deepStrictEqual(visit(cookie).session, { user_id: 42 });
    });

    it('should keep restart() out of the session data', () => {
      const { req } = run(timed);
      req.session.user_id = 42;
      assert.deepStrictEqual(Object.keys(req.session), [ 'user_id' ]);
      assert.deepStrictEqual({ ...req.session }, { user_id: 42 });
      assert.strictEqual(JSON.stringify(req.session), '{"user_id":42}');
    });

    it('should not write an empty session on restart()', () => {
      const { req, res } = run(timed);
      req.session.restart();
      assert.deepStrictEqual(setCookies(res), []);
    });

    it('should apply a lowered idleTimeout to cookies already out', () => {
      const month = session({ name: 'app', keys: KEYS, idleTimeout: 31 * 24 * HOUR });
      const first = run(month);
      first.req.session.user_id = 42;
      const cookie = setCookies(first.res).join('; ');
      now += 2 * HOUR;
      assert.deepStrictEqual(visit(cookie).session, {});
    });

    describe('maxDuration alone', () => {

      const hourly = session({ name: 'app', keys: KEYS, maxDuration: HOUR });

      const write = function(middleware, cookie, fn) {
        const { req, res } = run(middleware, cookie);
        fn(req.session);
        const set = setCookies(res);
        return set.length ? set.join('; ') : cookie;
      };

      it('should not rewrite an unchanged session', () => {
        const cookie = write(hourly, null, s => s.user_id = 42);
        now += 50 * MINUTE;
        assert.strictEqual(write(hourly, cookie, () => {}), cookie);
      });

      it('should not be pushed back when the session changes', () => {
        let cookie = write(hourly, null, s => s.user_id = 42);
        now += 50 * MINUTE;
        cookie = write(hourly, cookie, s => s.page = 2);
        now += 10 * MINUTE;
        assert.deepStrictEqual(run(hourly, cookie).req.session, {});
      });

      it('should read maxAge as maxDuration, over it', () => {
        const legacy = session({ name: 'app', keys: KEYS, maxAge: HOUR, maxDuration: 24 * HOUR });
        const cookie = write(legacy, null, s => s.user_id = 42);
        now += HOUR;
        assert.deepStrictEqual(run(legacy, cookie).req.session, {});
      });

    });

    it('should count a session from igo <= 6.5 from now and rewrite it', () => {
      let { session, set, cookie } = visit(oldCookie({ user_id: 42 }, now + 31 * 24 * HOUR));
      assert.deepStrictEqual(session, { user_id: 42 });
      assert.strictEqual(set.length, 1);

      for (let i = 1; i < 48; i++) {
        now += 30 * MINUTE;
        cookie = visit(cookie).cookie;
      }
      assert.deepStrictEqual(visit(cookie).session, { user_id: 42 });
      now += 30 * MINUTE;
      assert.deepStrictEqual(visit(cookie).session, {});
    });

    it('should still reject a session from igo <= 6.5 past its expiry', () => {
      assert.deepStrictEqual(visit(oldCookie({ user_id: 42 }, now - 1000)).session, {});
    });

  });

});
