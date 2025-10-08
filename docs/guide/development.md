
# Development

Igo.js uses npm scripts, [Webpack 5](https://webpack.js.org) and [Nodemon](https://nodemon.io/).

## Default npm scripts

The default `npm start` script will actually run two scripts in parallel:
- `nodemon` to start the server, and restart when a file is modified
- `webpack` to compile your frontend assets on the fly

```js
[...]
"scripts": {
  "eslint": "eslint ./src ./test ./app ./cli",
  "nodemon": "nodemon app.js",
  "start": "concurrently \"npm run nodemon\" \"npm run webpack\"",
  "webpack": "webpack --mode development --progress --watch",
  "test": "mocha",
  "compress": "npm run compress"
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

Copy this `nodemon.json` file if you want to run `eslint` automatically.
```json
{
  "watch": [
    "app"
  ],
  "ignore": [],
  "ext": "js json",
  "events": {
    "start": "npm run eslint"
  }
}
```