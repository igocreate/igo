# Igo Web Framework


📖 Read the [full documentation here](/docs/README.md).

## Short Presentation

Igo is a Web Framework for Node.js that comes with:
- Pre-configured [Express](http://expressjs.com/) and middlewares
- [Dust](http://www.dustjs.com/) as a template engine
- Basic ORM for **MySQL**
- Complete i18n support via [i18next](http://i18next.com/)
- Error handling
- Mailing system based on [Nodemailer](https://github.com/nodemailer/nodemailer)
- Pre-configured [Gulp](http://gulpjs.com/) tasks for development
- Test environment based on [Mocha](https://mochajs.org/)
- Caching with **Redis**

**All remarks, suggestions, PRs are welcome! 💕**

## 🚀 Getting Started (2 minutes)

Before using Igo, you need to install Node.js (>=5.9.1), Bower, Gulp and Mocha.
```sh
npm install -g bower gulp-cli mocha
```

Then, the easiest way to get started with Igo is to create a new project via the `igo` CLI.

```sh
npm install -g igo
igo create myproject && cd myproject
npm install && bower install
gulp
```

Go to [http://localhost:3000](http://localhost:3000) and start coding (and reading [the docs](/docs/README.md)).

Type ```mocha``` to run tests.
