
# Igo presentation

Igo is a NodeJS framework for developing web applications.

It provides a pre-configured development environment in just a few seconds.

## MVC
Igo is based on:
- A simple custom ORM, inspired by Rails ActiveRecord, working with MySQL
- DustJS, a powerful and performant template engine, maintained by LinkedIn
- ExpressJS, the most widely used NodeJS web framework

For detailed documentation, see [Models](/docs/models.md), [Views](/docs/views.md) and [Controllers](/docs/controllers.md).

## Development
Igo developement environment uses GulpJS with these modules:
- Nodemon to auto-refresh the server on code change
- JSHint to verify the quality of your backend Javascript code
- Bower to download and install frontend modules
- Less and Sass to compile your CSS files
- Uglify to compress and minify your frontend Javascript code
- Livereload to refresh your browser automatically

## testing
Igo is based on the MochaJS test framework, and offers more features:
- The test database is automatically reinitialized before first test
- All tests are run in a separate transaction that is rollbacked
- 
