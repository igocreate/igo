# Igo Web Framework

## Presentation

Igo is a complete web Framework for Node.js, including :
- Pre-configured [Express](http://expressjs.com/) and middlewares
- [Dust](http://www.dustjs.com/) as a template engine
- Basic ORM for MySQL
- Complete i18n support via [i18next](http://i18next.com/)
- Error handling
- Mailing system based on [Nodemailer](https://github.com/nodemailer/nodemailer)
- Pre-configured [Gulp](http://gulpjs.com/) tasks for development
- Test environment based on [Mocha](https://mochajs.org/)

## 🚀 Getting started

Before using Igo, you need to install Node.js (>=5.9.1) and a few modules:
```sh
$ npm install -g bower gulp-cli mocha
```

The easiest way to get started with Igo is to install the `igo` npm module globally (-g), and to run `igo create myproject` to create a new project.

```sh
$ npm install -g igo
$ igo create myproject && cd myproject
$ npm install && bower install
$ gulp
```

Go to [localhost:3000](http://localhost:3000) and start coding.

Type ```mocha``` to run the unit tests.

## 📖 Documentation
Read the [full documentation here](/docs/README.md).
