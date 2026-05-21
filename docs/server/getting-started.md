
# Igo Server

## Introduction

`@igojs/server` is the framework that holds Igo.js together. It wraps Express 5 with everything a typical web app needs — routing conventions, forms, internationalization, email, caching, error handling, a project scaffold and a CLI — without forcing you into a heavy plugin ecosystem.

The goal is a small surface that lets you ship a real application by writing controllers and templates, not by configuring middleware.

### Key Features

* **Express 5 core** — async-friendly request handling out of the box
* **File-based project layout** — `app/controllers/`, `app/routes.js`, `views/`, `sql/`, `locales/`, `seeds/`
* **Forms with sanitize → validate → convert pipeline** — schema-driven, type-coerced
* **i18n via [i18next](https://www.i18next.com/)** — language detection, translation files, CLI for syncing
* **Redis cache** — `get` / `put` / `fetch` / `flush` with namespaced keys
* **Flash scope** with automatic Redis fallback for large payloads
* **Mailer** — Nodemailer with MJML and Dust templates
* **Robust error handling** — request errors, unhandled rejections, uncaught exceptions, all with throttled crash emails
* **CLI** — `igo create`, `igo db`, `igo i18n`, `igo console`

## Quick Start

Scaffold a new project:

```sh
npx @igojs/server create myproject
cd myproject
npm install
npm start
```

`npm start` runs nodemon + webpack in parallel — the server reloads on `app/` changes, the bundle rebuilds on `js/` and `scss/` changes.

## Minimal app

If you'd rather wire things up by hand:

```js
const igo = require('@igojs/server');

igo.app.run();
// → calls configure() (middleware chain, db, cache, i18n, view engine, routes)
// → listens on config.httpport
```

Define routes in `app/routes.js`, controllers in `app/controllers/`, templates in `views/`, and you have an app.

## Configuration

Configuration is loaded from several files, in order — see [Development › Configuration](../guide/development#configuration) for the full list. The minimum is an `app/config.js` that exports a function taking the config object:

```js
// app/config.js
module.exports = (config) => {
  config.httpport = process.env.PORT || 3000;
  config.mysql    = { database: process.env.MYSQL_DATABASE };
  config.redis    = { socket: { host: process.env.REDIS_HOST || '127.0.0.1' } };
};
```

## Next steps

* **[Routes & controllers](./routes)** — Routing and the controller layer
* **[Views](./views)** — View engine, helpers, custom helpers
* **[Forms](./forms)** — Sanitize/validate/convert pipeline
* **[Cache](./cache)** — Redis cache API
* **[Mailer](./mailer)** — Sending emails with MJML/Dust
* **[Flash scope](./flash)** — Cross-redirect messages
* **[i18n](./i18n)** — Multi-language support
* **[Error handling](./errors)** — Catching, throttling and notifying
* **[Development & CLI](../guide/development)** — npm scripts, webpack, CLI commands
* **[Production](../guide/production)** — Deploy, logging, monitoring
* **[Testing](../guide/tests)** — Mocha helpers, controller tests
