
# Development

Igo.js uses npm scripts, [Vite](https://vitejs.dev) and [Nodemon](https://nodemon.io/).

## Default npm scripts

The default `npm start` script will actually run two scripts in parallel:
- `nodemon` to start the server, and restart when a file is modified
- `vite` to compile your frontend assets on the fly with hot module replacement

```js
[...]
"scripts": {
  "eslint": "eslint ./src ./test ./app ./cli",
  "nodemon": "nodemon app.js",
  "start": "concurrently \"npm run nodemon\" \"npm run vite\"",
  "vite": "vite build --watch",
  "test": "mocha",
  "compress": "npm run compress"
},
[...]
```

## Vite

Your local `vite.config.js` can be as short as:
```js
const viteConfig = require('igo').dev.viteConfig;
module.exports = viteConfig;
```

You can override this default config as you like.

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