
# Controllers

Igo.js uses [Express 4](http://expressjs.com/) as a web framework for the Controller layer.


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
config.cookieSecret         = 'abcdefghijklmnopqrstuvwxyz';
config.cookieSession.keys   = [ 'azertyuiop' ];
config.cookieSession.maxAge = 24 * 60 * 60 * 1000; // 24 hours
```

### Multipart data

Multipart data is parsed with [multiparty](https://github.com/pillarjs/multiparty). The fields and the files are put in `req.body` and `req.files`, and ready to be used.

### Validation

Request validation is made with [Validator.js](https://github.com/validatorjs/validator.js)

### Flash Scope

The Flash scope allows data to be stored in session during only 2 requests. Very useful when performing redirects.

#### Usage

**Basic flash for small data:**

```js
app.post('/login', (req, res) => {
  req.flash('message', 'Login successful');
  req.flash('user', { id: 1, name: 'John' });
  res.redirect('/dashboard');
});
```

Data is automatically cleared after the next GET request and available in views via `res.locals.flash`.

#### Smart Storage

The flash middleware automatically handles large objects to prevent cookie overflow issues:

- **Small objects (< 1KB)**: Stored in session cookie (fast, no Redis dependency)
- **Large objects (> 1KB)**: Automatically switched to Redis-backed `cacheflash`
- **Very large objects (> 10KB)**: Warning logged to help identify potential design issues

**Example with automatic handling:**

```js
// Small data - stays in cookie
req.flash('message', 'Hello');

// Large array - automatically uses Redis
req.flash('items', largeArray); // > 1KB, Redis used transparently
```

**Explicit Redis storage for large data:**

```js
// For very large objects, you can explicitly use cacheflash
req.cacheflash('bigdata', veryLargeObject);
```

#### How it works

The Flash middleware provides two methods:

- `req.flash(key, value)` - Smart storage with automatic Redis fallback
- `req.cacheflash(key, value)` - Explicit Redis storage (for large data)

Objects > 1KB are automatically stored in Redis with only a UUID in the session cookie, preventing "header too large" errors from nginx or browsers.