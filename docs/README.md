# Igo.js

![Build Status](https://github.com/igocreate/igo/actions/workflows/node.js.yml/badge.svg)

## Introduction

Igo.js is a full-featured Node.js web framework that gives you a production-ready application with a complete development environment in seconds.

Built on top of Express, Igo.js integrates the most popular Node.js libraries and tools: Webpack 5 for asset bundling, an ORM for MySQL/PostgreSQL, Redis caching, Mocha for testing, and more.

After building several Node.js projects, we realized we were duplicating the same technical stack over and over: Express configuration, Webpack setup, database connections, test helpers, and countless dependencies. Igo.js packages all of this into a single framework, letting you focus on building your application instead of configuring tools.

## Installation

```sh
# install mocha
npm install -g mocha

# install igo.js
npm install -g igo
```

## Getting started
```sh
# create new project
igo create myproject
cd myproject

# install node.js dependencies
npm install

# start the server on http://localhost:3000
npm start
```

## Configuration
The Igo.js configuration is located in `/app/config.js`.
The configuration is initialized at startup, and can be retrieved through igo module:
```js
var config = require('igo').config`;
```

Some configuration parameters can be defined with environment variables. Igo.js uses [dotenv](https://github.com/motdotla/dotenv), so you can just add/override variables in the `/.env` file.
E.g:
```txt
# development database
MYSQL_DATABASE=mydatabase
```

---