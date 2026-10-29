
# Routes & Controllers

Igo.js uses [Express 5](http://expressjs.com/) for routing.

## Defining Routes

Routes are defined in `/app/routes.js`:

```js
module.exports.init = function(app) {
  app.get('/',            controllers.WelcomeController.index);
  app.get('/users',       controllers.UserController.list);
  app.get('/users/:id',   controllers.UserController.show);
  app.post('/users',      controllers.UserController.create);
  app.put('/users/:id',   controllers.UserController.update);
  app.delete('/users/:id', controllers.UserController.remove);
};
```

See the [Express routing documentation](http://expressjs.com/en/guide/routing.html) for the full routing API.

## Controllers

Controllers are plain modules in `/app/controllers/`. Each export is a request handler:

```js
// app/controllers/UserController.js

module.exports.list = async (req, res) => {
  const users = await User.list();
  res.render('users/list', { users });
};

module.exports.show = async (req, res) => {
  const user = await User.find(req.params.id);
  if (!user) return res.status(404).render('404');
  res.render('users/show', { user });
};

module.exports.create = async (req, res) => {
  const form = new UserForm().submit(req);
  if (form.errors) {
    req.flash('form', form);
    return res.redirect('/users/new');
  }
  await User.create(form.getValues());
  res.redirect('/users');
};
```

## JSON Responses

```js
module.exports.api = async (req, res) => {
  const users = await User.list();
  res.json({ users });
};
```

For a JSON API — validation, RFC 9457 errors and JSON 404s — mount the routes
with `app.api()` instead. See [JSON APIs](./api).

## Redirects

```js
module.exports.login = async (req, res) => {
  req.flash('message', 'Welcome back!');
  res.redirect('/dashboard');
};
```

## Middleware Chain

Igo.js configures the following middleware in order:

1. **Compression** — Gzip (threshold: 1KB)
2. **Static files** — `/public` directory (1-year cache in production)
3. **Cookie parser** — Populates `req.cookies`; verifies cookies written with `{ signed: true }` into `req.signedCookies`
4. **Session** — Encrypted session cookie (31-day maximum duration, optional idle timeout)
5. **Body parsers** — URL-encoded and JSON (10MB limit)
6. **Multipart** — File upload parsing via [multiparty](https://github.com/pillarjs/multiparty)
7. **Request logger** — Trace id and one log line per request (see [Logging](./logging))
8. **Flash** — Flash messages (see [Flash](./flash))
9. **Validator** — Request validation (see [Forms](./forms))
10. **i18n** — Language detection (see [i18n](./i18n))
11. **Locals** — Sets `res.locals.env`, `res.locals.lang`
12. **Assets** — Webpack manifest injection
13. **Routes** — Your application routes
14. **Error handler** — Catches errors (see [Errors](./errors))

## Static Files

All files in `/public` are served statically:

```js
app.use(express.static('public'));
```

In production, static files are served with a 1-year `max-age` cache header.

## File Uploads

Multipart POST requests are automatically parsed. Fields go to `req.body`, files to `req.files`:

```js
module.exports.upload = async (req, res) => {
  if (req.files && req.files.avatar) {
    const file = req.files.avatar;
    // file.name — original filename
    // file.path — temporary path
    // file.size — file size in bytes
  }
};
```

## Cookies & Sessions

`cookie-parser` populates `req.cookies` and verifies cookies written with `{ signed: true }` into `req.signedCookies`. The session lives in a single cookie encrypted with AES-256-GCM: unreadable and untamperable client-side.

```js
config.cookieSecret              = 'your-secret-key';         // signs req.signedCookies
config.cookieSession.keys        = ['your-session-key'];      // encrypts the session
config.cookieSession.maxDuration = 24 * 60 * 60 * 1000;       // since the session started
config.cookieSession.idleTimeout = 60 * 60 * 1000;            // since the last request
```

### Session expiry

Two deadlines run side by side, and the session expires at the first one reached:

| Setting | Counts from | Started over by | Default | Variable |
|---------|-------------|-----------------|---------|----------|
| `maxDuration` | the start of the session | `req.session.restart()` only | 31 days | `SESSION_MAX_DURATION` |
| `idleTimeout` | the last request that read the session | every page or API call that uses the session, and `restart()` | off | `SESSION_IDLE_TIMEOUT` |

- `maxDuration` is the hard limit: even a user active all along is signed out once it is spent.
- `idleTimeout` signs out an inactive user: as long as requests keep coming, the session lives on. An unchanged session has its cookie rewritten at most once a minute to push the deadline back. Off by default, for the applications that need it.

With `maxDuration` at 24 hours and `idleTimeout` at 1 hour, a user who signs in on Monday at 9:00 and does nothing is signed out at 10:00; one who clicks every 20 minutes is signed out on Tuesday at 9:00.

The variables let the infrastructure tune both without a release. They take `90` (seconds), `15m`, `1h` or `1d`; anything else stops the server at startup. For a business application, [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#session-expiration) suggests 15 to 30 minutes of inactivity and 4 to 8 hours in all.

These times live in the encrypted payload and are checked server-side against the current settings: a copied cookie stops working past its expiry, even if the client keeps sending it, and lowering a setting applies to the sessions already out. Before that expiry, though, nothing revokes it: signing out clears the browser's cookie, not a copy — short timeouts are what bound a stolen one.

### Restarting on sign-in

The session starts at its first write, which may come before sign-in: a redirect URL kept for after the login form, a CSRF secret. Call `req.session.restart()` on sign-in so that `maxDuration` counts from there:

```js
req.session.user_id = user.id;
req.session.restart();
```

`restart()` keeps the session's data — unlike express-session's `regenerate()`, which empties it — and starts both deadlines over. It is not part of the data: it stays out of the cookie, of `Object.keys(req.session)` and of a spread. The test agent provides it as a no-op.

### Keys

`keys` accepts several entries: the first encrypts (HKDF-SHA256 derives the AES key from it), the others decrypt only. Handy to change the key without signing everyone out — but a leaked key must be dropped, not kept around, since anyone holding it can forge a session.

### Upgrading from igo < 6.6

`maxDuration` replaces `maxAge`, which counted from the session's last change: any write — a flash message, a saved filter — pushed it back, so an active user could stay signed in indefinitely. `maxDuration` counts from the session's start, and an active user is signed out once it is spent. A `maxAge` set by the project is read as `maxDuration`, with a warning at startup: rename it.

Sessions written before carry no start: they are counted from their first request after the deploy, so nobody is signed out then.

### Upgrading from igo < 6.2

Sessions used to be base64-encoded and signed, ie. readable client-side. Those cookies are rejected: every session is dropped on deploy and users have to sign in again.
