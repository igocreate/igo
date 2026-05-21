# @igojs/igo

Meta-package for [Igo.js](https://igocreate.github.io/igo). Installs the full stack — server, ORM, template engine, reactive components — in one go.

## Install

```sh
npm install @igojs/igo
```

This pulls in:

- [`@igojs/server`](https://www.npmjs.com/package/@igojs/server) — Express 5 framework, CLI, mailer, i18n
- [`@igojs/db`](https://www.npmjs.com/package/@igojs/db) — Active Record-style ORM (MySQL, PostgreSQL)
- [`@igojs/dust`](https://www.npmjs.com/package/@igojs/dust) — Async template engine
- [`@igojs/component`](https://www.npmjs.com/package/@igojs/component) — Reactive single-file components with SSR

This package has no runtime entry point — `require('@igojs/igo')` returns nothing. Import the individual packages instead:

```js
const igo = require('@igojs/server');
const { Model } = require('@igojs/db');
const dust = require('@igojs/dust');
```

## Quick start

Scaffold a new project:

```sh
npx @igojs/server create myproject
cd myproject
npm install
npm start
```

## Documentation

Full documentation: <https://igocreate.github.io/igo/>

## License

ISC
