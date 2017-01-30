# Igo.js [![Build Status](https://travis-ci.org/igocreate/igo.svg?branch=master)](https://travis-ci.org/igocreate/igo)

Igo is a Web Framework for Node.js that comes with:
- Pre-configured Express, middlewares, and Dust
- Pre-configured [Webpack](https://webpack.js.org) and [Nodemon](https://nodemon.io/)
- Full-featured testing environment based on [Mocha](https://mochajs.org/)
- Basic ORM for MySQL

All remarks, suggestions, PRs are welcome! 💕

# 🚀 Getting Started

Before using Igo, you need to install Node.js (>=6.x) and Mocha.
Then, you can easily create a new project via the `igo` CLI.

```sh
npm install -g igo mocha
igo create myproject
cd myproject
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) and start coding (and reading [the docs](/docs/README.md)).

Type ```mocha``` to run tests.

# Documentation

- [Introduction](/docs/introduction.md)
  - Presentation, Installation, Getting Started, Configuration
- [Models](/docs/models.md)
  - MySQL configuration, SQL migrations, Model API
- [Views](/docs/views.md)
  - Template syntax, I18n, View helpers
- [Controllers](/docs/controllers.md)
  - Routes, Middlewares
- [Development](/docs/development.md)
  - Webpack, Nodemon
- [Test](/docs/test.md)
  - Using Mocha, testing controllers
- [Production](/docs/production.md)
  - Running Igo in production, receiving email alerts
- Other features
  - [Cache](/docs/cache.md) : Cache API
  - Igo Mailer : TODO
  - Igo Logger : TODO
