# Igo Web Framework

## Presentation

Igo is a complete web Framework for NodeJS, including :
- Pre-configured ExpressJS and middlewares
- [DustJS](http://www.dustjs.com/) as a template engine
- Basic ORM for MySQL
- Complete i18n support
- Error handling
- Mailing system based on [Nodemailer](https://github.com/nodemailer/nodemailer)
- Pre-configured [GulpJS](http://gulpjs.com/) tasks for development
- Test environment based on [MochaJS](https://mochajs.org/)

## Getting started

Before using Igo, you need to install NodeJS (>=5.9.1) and a few modules:
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

## Documentation
### [Presentation](/docs/presentation.md)
### [Models](/docs/models.md)
### [Views](/docs/views.md)
### [Controllers](/docs/controllers.md)
### [Development](/docs/development.md)
### [Test](/docs/test.md)
### [Production](/docs/production.md)
### Getting deeper
#### [Assets](/docs/assets.md)
#### [Mailer](/docs/mailer.md)
