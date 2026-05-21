# @igojs/dust

Async JavaScript template engine for [Igo.js](https://igocreate.github.io/igo), inspired by [Dust.js](https://github.com/linkedin/dustjs). Zero runtime dependencies, Express integration, single-file component support.

## Why

We used [Dust.js](https://github.com/linkedin/dustjs) from 2012 onward, then followed it through its takeover by LinkedIn and its abandonment in 2018. Looking for a replacement that was just as simple, fast, extensible, and ideally syntax-compatible, we couldn't find one — so we rewrote our own. The result has zero runtime dependencies and renders ~30× faster than the original engine.

## Install

```sh
npm install @igojs/dust
```

## Quick start

```js
const dust = require('@igojs/dust');

dust.configure({ views: './views', cache: true });

const html = await dust.render('Hello, {name}!', { name: 'World' });
// => 'Hello, World!'

const page = await dust.renderFile('home.dust', { title: 'Home' });
```

As an Express view engine:

```js
const express = require('express');
const dust = require('@igojs/dust');

const app = express();
app.engine('dust', dust.engine);
app.set('view engine', 'dust');
app.set('views', './views');
```

## Documentation

Full documentation: <https://igocreate.github.io/igo/dust/getting-started>

- [Syntax basics](https://igocreate.github.io/igo/dust/basics)
- [Logic & loops](https://igocreate.github.io/igo/dust/logic)
- [Helpers & filters](https://igocreate.github.io/igo/dust/helpers)
- [Partials & layouts](https://igocreate.github.io/igo/dust/partials)
- [API reference](https://igocreate.github.io/igo/dust/api)

## License

ISC
