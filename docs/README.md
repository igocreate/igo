
# Documentation

Igo.js is a Node.js web framework for developing web applications.

In a few seconds, it provides a working pre-configured development environment.

## Why but why ?

We love Node.js, it's a fantastic and easy technology to build and run web applications.
After building a few projects, we found that it was very easy to duplicate the *technical* files:
- the `app.js` for Express and its bunch of configured middlewares,
- the `Gulpfile.js`,
- the MySQL configuration and connection,
- the `package.json` dependencies,
- the init file for Mocha,
- ...etc.

After several months and more projects using the same configuration and the same technical stack, well, it appeared clearly that this configuration had no added value, and should not to be duplicated over and over.

That's how Igo.js was born.

## MVC
The MVC part of Igo is based on:
- A very basic ORM for MySQL, inspired by [Rails ActiveRecord](http://guides.rubyonrails.org/active_record_basics.html)
- [Dust](http://www.dustjs.com/), a powerful and performant template engine, maintained by LinkedIn
- [Express](http://expressjs.com/), the most widely used Node.js web framework

🌀 For detailed documentation, see [Models](/docs/models.md), [Views](/docs/views.md) and [Controllers](/docs/controllers.md).


## Development
Igo uses [Gulp](http://gulpjs.com/) with these modules:
- [Nodemon](https://nodemon.io/) to auto-refresh the server on code change
- [JSHint](http://jshint.com/) to verify the quality of your backend Javascript code
- [Bower](https://bower.io) to download and install frontend modules
- [Less](http://lesscss.org/) or [Sass](http://sass-lang.com/) as a CSS preprocessor
- [Uglify](http://lisperator.net/uglifyjs/) to compress and minify your frontend Javascript code
- [Livereload](https://github.com/vohof/gulp-livereload) to refresh your browser automatically

🌀 See the [Development](/docs/development.md) section to learn more.


## Test
Igo uses [Mocha](https://mochajs.org/) test framework, and offers more features:
- Testing controllers layer with [superagent](https://github.com/visionmedia/superagent)
- Automatic test database reinitialization before first test
- Test isolation: each test runs in a transaction that is rollbacked

🌀 See the [Test](/docs/test.md) section to learn more.


## Production
- Igo dev dependencies are packaged in a separate module [igo-dev](https://github.com/arnaudm/igo-dev)
- Production configuration is loaded separately
- Runtime errors are caught and can be sent by email to the admin
- Igo logger uses [winston](https://github.com/winstonjs/winston) so you can log where you like (eg: [papertrail](https://github.com/kenperkins/winston-papertrail))

🌀 See the [Production](/docs/production.md) section to learn more.
