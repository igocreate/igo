
# Controllers

Igo uses [Express 4](http://expressjs.com/) as a web framework for the Controller layer.


## Routes

Routes are defined in the `/app/routes.js` file.

See the routing documentation here: See documentation here: http://expressjs.com/en/guide/routing.html

```js
module.exports.init = function(app, controllers) {
  // welcome
  app.get ('/',   controllers.WelcomeController.index);
};
```

## Middlewares configuration

### Compression

```js
var compression       = require('compression');
app.use(compression());
```

### Static files

All files located in `/public` are served statically with `express.static()`.

```js
app.use(express.static('public'));
```

### Cookies and Sessions

Cookies are signed with the [cookie-parser](https://github.com/expressjs/cookie-parser) module.

Sessions are encoded, signed and stored in cookies with [cookie-session](https://github.com/expressjs/cookie-session).

It is highly recommended configure your own secret keys in `/app/config.js`.

```js
config.signedCookiesSecret = 'abcdefghijklmnopqrstuvwxyz';
config.cookieSessionConfig = {
  name:   'app',
  keys:   [ 'aaaaaaaaaaa' ]
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
};
```

### Multipart data

Multipart data is parsed with [formidable](https://github.com/felixge/node-formidable). The fields and the files are put in `req.body` and `req.files`, and ready to be used.

### Validation

Request validation is made with [express-validator](https://github.com/ctavan/express-validator).

### Flash Scope

The Flash scope allows data to be stored in session during only 2 requests. Very useful when performing redirects.

The Flash scope is a middleware as simple as this:

```js
module.exports = function(req, res, next) {
  req.session.flash = req.session.flash || {};
  res.locals.flash  = req.session.flash;
  if (req.method === 'GET') {
    // clear flash scope
    req.session.flash = {};
  }
  req.flash = function(key, value) {
    req.session.flash[key] = value;
  };
  next();
};
```
