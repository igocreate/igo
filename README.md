# Igo: web dev environment

_Note: Work is In Progress._

## Presentation

Igo is a complete web development environment based on NodeJS, with :
- Pre-configured expressjs & middlewares
- Templating system [dustjs](http://www.dustjs.com/) as a template engine
- Basic ORM for MySQL
- Configuration management
- Error handling
- Cache API based on Redis
- Mailing system based on [nodemailer](https://github.com/nodemailer/nodemailer)
- Pre-configured [gulp](http://gulpjs.com/) tasks for development
- Test environment based on [mochajs](https://mochajs.org/)

## Getting started

Igo can be installed globally (-g) to provide a simple CLI.

```sh
$ npm install -g igo bower gulp-cli mocha
$ igo create myproject
$ cd myproject
$ npm install
$ bower install
$ gulp
$ open http://localhost:3000
```
