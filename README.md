# Igo Web Framework

## Presentation

Igo is a complete web Framework for NodeJS, including :
- Pre-configured ExpressJS + common middlewares
- Templating system [dustjs](http://www.dustjs.com/)
- Basic ORM for MySQL
- Configuration management
- Error handling
- Cache API based on Redis
- Mailing system based on [Nodemailer](https://github.com/nodemailer/nodemailer)
- Pre-configured [GulpJS](http://gulpjs.com/) tasks for development
- Test environment based on [MochaJS](https://mochajs.org/)

## Getting started

The easiest way to start with Igo is to install the igo module globally (-g), and to init an empty project.

```sh
$ npm install -g igo bower gulp-cli mocha
$ igo create myproject
$ cd myproject
$ npm install
$ bower install
$ gulp
$ open http://localhost:3000
```

## Documentation
### [Presentation](/docs/presentation.md)
### [Models](/docs/models.md)
### [Views](/docs/views.md)
### [Controllers](/docs/controllers.md)
### [Testing](/docs/testing.md)
### [Assets](/docs/assets.md)
### [Mailer](/docs/mailer.md)
