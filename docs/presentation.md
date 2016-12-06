
# Igo presentation

Igo is a NodeJS framework for developing web applications.

It provides a pre-configured development environment in just a few seconds.

## MVC
Igo is based on:
- A very basic ORM for MySQL, inspired by Rails ActiveRecord
- DustJS, a powerful and performant template engine, maintained by LinkedIn
- ExpressJS, the most widely used NodeJS web framework

For detailed documentation, see [Models](/docs/models.md), [Views](/docs/views.md) and [Controllers](/docs/controllers.md).

## Development
Igo development environment uses GulpJS with these modules:
- Nodemon to auto-refresh the server on code change
- JSHint to verify the quality of your backend Javascript code
- Bower to download and install frontend modules
- Less and Sass to compile your CSS files
- Uglify to compress and minify your frontend Javascript code
- Livereload to refresh your browser automatically

## Testing
Igo is based on the MochaJS test framework, and offers more features:
- Controllers testing, via superagent
- The test database is automatically reinitialized before first test
- All tests are run in a separate transaction that is rollbacked

## Runtime environment
- Igo dev dependencies are packaged in a separate module [igo-dev](https://github.com/arnaudm/igo-dev)
- Production configuration is loaded separately
- Runtime errors are caught and can be sent by email to the admin
- Igo cache uses Redis
- Igo logger uses winston so you can log where you like (eg: papertrail)
