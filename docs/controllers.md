
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

### Static files

Static files located in `/public` are directly served by `express.static()`.

### Sessions

Sessions data is crypted and stored in cookies with [cookie-session](https://github.com/expressjs/cookie-session).

### Multipart data

Multipart data is parsed with [formidable](https://github.com/felixge/node-formidable). The fields and the files are put in req.fields and req.files, and ready to be used.

### Validation

Request validation is made with [express-validator](https://github.com/ctavan/express-validator).

### Flash scope

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
