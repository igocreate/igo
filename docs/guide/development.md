
# Development

Igo.js uses npm scripts, [Webpack 2](https://webpack.js.org) and [Nodemon](https://nodemon.io/).

## Default npm scripts

The default `npm start` script will actually run two scripts in parallel:
- `nodemon` to start the server, and restart when a file is modified
- `webpack` to compile your frontend assets on the fly

```js
[...]
"scripts": {
  "jshint": "jshint --reporter=node_modules/jshint-stylish ./app/**/*.js || true",
  "nodemon": "nodemon app.js",
  "start": "npm-run-all --parallel nodemon webpack",
  "webpack": "webpack -p --progress --watch",
  "test": "mocha"
},
[...]
```

## Webpack

Your local `webpack.config.js` can be as short as:
```js
//
const webpackConfig = require('igo').dev.webpackConfig;
module.exports = webpackConfig;
```

You can override this default config as you like.
Here is [the default config](/src/dev/webpack.config.js), embedded with Igo.js.

### Nodemon

Copy this `nodemon.json` file if you want to run `jshint` automatically.
```json
{
  "watch": [
    "app"
  ],
  "ignore": [],
  "ext": "js json",
  "events": {
    "start": "npm run jshint"
  }
}
```