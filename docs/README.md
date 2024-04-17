# Igo.js

![Build Status](https://github.com/igocreate/igo/actions/workflows/node.js.yml/badge.svg)

## Introduction

Igo.js is a full-featured Node.js web framework for developing web applications.

Igo.js is not a boilerplate to help you start with Node.js. It embeds and leverages on the most used frameworks and libraries in the Node.js ecosystem.

In a few seconds it can give you a production-ready application and a 100% working development environment.

We love Node.js, it's a fantastic and easy technology to build and run web applications. But after building several projects, we found that it was a pain to duplicate these many technical files:

app.js for Express and its bunch of middlewares, plus the configuration for these middlewares,
Gulpfile.js or webpack.config.js to setup a nice development environment,
MySQL, Redis, SMTP configurations and connections,
package.json with so many dependencies,
Mocha configuration and tools to write good tests,
...etc.
After several months spent duplicating the same configuration and the same technical stack over and over, well, it appeared clearly that all this had very little added value. That's how Igo.js was born.

## Installation

```sh
# install mocha
npm install -g mocha

# install igo
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
The Igo configuration is located in `/app/config.js`.
The configuration is initialized at startup, and can be retrieved through igo module:
```js
var config = require('igo').config`;
```

Some configuration parameters can be defined with environment variables. Igo uses [dotenv](https://github.com/motdotla/dotenv), so you can just add/override variables in the `/.env` file.
E.g:
```txt
# development database
MYSQL_DATABASE=mydatabase
```