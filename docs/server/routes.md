
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
3. **Cookie parser** — Signed cookies
4. **Cookie session** — Session in cookies (31-day expiry)
5. **Body parsers** — URL-encoded and JSON (10MB limit)
6. **Multipart** — File upload parsing via [multiparty](https://github.com/pillarjs/multiparty)
7. **Flash** — Flash messages (see [Flash](./flash))
8. **Validator** — Request validation (see [Forms](./forms))
9. **i18n** — Language detection (see [i18n](./i18n))
10. **Locals** — Sets `res.locals.env`, `res.locals.lang`
11. **Assets** — Webpack manifest injection
12. **Routes** — Your application routes
13. **Error handler** — Catches errors (see [Errors](./errors))

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

Cookies are signed with [cookie-parser](https://github.com/expressjs/cookie-parser). Sessions are stored in cookies with [cookie-session](https://github.com/expressjs/cookie-session).

Configure your secret keys in `/app/config.js`:

```js
config.cookieSecret         = 'your-secret-key';
config.cookieSession.keys   = ['your-session-key'];
config.cookieSession.maxAge = 24 * 60 * 60 * 1000; // 24 hours
```
