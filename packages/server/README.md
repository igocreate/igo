# @igojs/server

Express 5 web framework for Node.js with batteries included: ORM, templating, forms, i18n, Redis caching, mailer, CLI.

## Install

```sh
npm install @igojs/server
```

Or scaffold a new project:

```sh
npx @igojs/server create myproject
cd myproject
npm install
npm start
```

## Quick start

```js
const igo = require('@igojs/server');

igo.app.run();   // configures middleware + listens on config.httpport
```

Define routes in `app/routes.js`, controllers in `app/controllers/`, templates in `views/`, models extending `igo.Model`, forms extending `igo.Form`.

## Documentation

Full documentation: <https://igocreate.github.io/igo/>

- [Routes & controllers](https://igocreate.github.io/igo/server/routes)
- [Forms](https://igocreate.github.io/igo/server/forms)
- [Views & view helpers](https://igocreate.github.io/igo/server/views)
- [Cache (Redis)](https://igocreate.github.io/igo/server/cache)
- [Mailer](https://igocreate.github.io/igo/server/mailer)
- [Flash scope](https://igocreate.github.io/igo/server/flash)
- [i18n](https://igocreate.github.io/igo/server/i18n)
- [Error handling](https://igocreate.github.io/igo/server/errors)
- [Development & CLI](https://igocreate.github.io/igo/guide/development)
- [Production](https://igocreate.github.io/igo/guide/production)
- [Testing](https://igocreate.github.io/igo/guide/tests)

## License

ISC
