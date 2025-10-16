# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Igo.js is a Node.js web framework built on Express. It's a framework package (not an application) that provides a complete stack for building web applications with pre-configured Express, Webpack, Mocha testing, and a basic ORM for MySQL/PostgreSQL.

**Key concept**: This is a framework that gets installed in other projects via npm. The `skel/` directory contains templates used by `igo create` to bootstrap new applications.

## Commands

### Testing
```bash
# Run all tests
npm test
# or
mocha

# Run a single test file
mocha test/db/ModelTest.js
```

### Linting
```bash
npm run eslint
```

### CLI Commands (for projects using igo)
```bash
# Create new project
igo create myproject

# Database operations
igo db migrate
igo db seed
igo db reset

# i18n operations
igo i18n export
igo i18n import

# Asset compression
igo compress
```

## Architecture

### Core Structure

- **`src/`** - Framework source code
  - **`app.js`** - Main Express app initialization and middleware setup
  - **`config.js`** - Default configuration (overridden by user projects in `app/config.js`)
  - **`routes.js`** - Routes loader (loads from user's `app/routes.js`)
  - **`db/`** - ORM implementation
    - `Model.js` - Base model class with CRUD methods
    - `Query.js` - Query builder
    - `CachedQuery.js` - Query caching layer
    - `Schema.js` - Table schema definition
    - `drivers/` - Database drivers (mysql, postgresql)
  - **`forms/`** - Form handling and validation
  - **`connect/`** - Express middlewares (flash, validator, multipart, error handler)
  - **`dev/`** - Development tools (webpack config, test helpers)

- **`cli/`** - CLI commands implementation (igo.js is the entry point)

- **`skel/`** - Project templates for `igo create` command

- **`test/`** - Framework tests

### Application Lifecycle

1. **Initialization** (`app.configure()`):
   - Services initialized in order: config, igodust, logger, cache, dbs, mailer
   - Each service has an `init()` method called sequentially
   - Express middlewares configured
   - User routes loaded from `app/routes.js` (in user projects)

2. **Request Flow**:
   - Express static middleware
   - Cookie/session parsing (skipped in test mode)
   - Flash messages, validation middleware
   - i18n handling
   - Locals injection
   - User routes
   - Error handling

### ORM Patterns

Models extend the base Model class and define a schema:

```javascript
const Model = require('igo').Model;

class User extends Model({
  table: 'users',
  columns: { id: 'integer', name: 'string', email: 'string' }
}) {}
```

- **Queries** return `Query` or `CachedQuery` instances based on schema cache config
- **Hooks**: `beforeCreate()`, `beforeUpdate()` available on model instances
- **Query builder**: Chainable API (`.where()`, `.includes()`, `.scope()`, etc.)

### Test Environment

- **Test mode detection**: `config.env === 'test'`
- **Test agent**: `src/dev/test/agent.js` provides mock HTTP request/response for testing
  - `agent.get(url, options)` - Mock GET request
  - `agent.post(url, options)` - Mock POST request
- **Test initialization**: Cookie/session parsing disabled in test mode (mock requests handle this differently)

### Configuration Override

User projects override config by requiring igo and extending config:

```javascript
const igo = require('igo');
igo.config.httpport = 8080;
igo.config.mysql.database = 'mydb';
```

Config loaded from `.env` via dotenv at startup.

## Important Notes

- **Deprecated**: `Model.destroy()` → use `Model.delete()` instead
- **Database**: Supports MySQL and PostgreSQL drivers via adapter pattern
- **Caching**: Redis-based query result caching when `schema.cache = true`
- **i18n**: Uses i18next with filesystem backend, language detection via query/cookie/localStorage
