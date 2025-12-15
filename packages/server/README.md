# @igojs/server

Express-based web framework for Node.js with batteries included.

## Installation

```sh
npm install @igojs/server
```

## Features

- **Express 5** - Web server with pre-configured middlewares
- **Configuration** - Environment-based config with dotenv support
- **Routing** - File-based controller loading
- **Views** - Dust templating via @igojs/dust
- **Forms** - Form handling and validation
- **i18n** - Internationalization with i18next
- **Cache** - Redis-based caching
- **Mailer** - Email sending with nodemailer and MJML
- **CLI** - Project scaffolding and database commands
- **Dev tools** - Vite integration, test helpers

## Quick Start

```javascript
const igo = require('@igojs/server');

// Configure
igo.config.httpport = 3000;

// Start
igo.app.run();
```

## API

### Core

| Export | Description |
|--------|-------------|
| `app` | Express application with middlewares |
| `config` | Configuration object |
| `cache` | Redis cache API |
| `logger` | Winston logger instance |
| `express` | Express module |
| `i18next` | i18next instance |

### Database (via @igojs/db)

| Export | Description |
|--------|-------------|
| `Model` | Base model class for ORM |
| `dbs` | Database connections |
| `migrations` | Database migration tools |
| `CacheStats` | Cache statistics |

### Utilities

| Export | Description |
|--------|-------------|
| `Form` | Form handling class |
| `mailer` | Email utilities |
| `dust` | Template engine (@igojs/dust) |
| `dev` | Development tools (Vite, test agent) |

## Configuration

Configuration is loaded from `app/config.js` and `.env` files:

```javascript
// app/config.js
module.exports = function(config) {
  config.httpport = process.env.PORT || 3000;

  config.mysql = {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    database: process.env.MYSQL_DATABASE || 'myapp',
  };

  config.redis = {
    host: process.env.REDIS_HOST || '127.0.0.1',
  };
};
```

## CLI Commands

```sh
# Create new project
igo create myproject

# Database
igo db migrate
igo db seed
igo db reset

# i18n
igo i18n export
igo i18n import
```

## Documentation

See the [full documentation](https://igocreate.github.io/igo/#/server/controllers).
