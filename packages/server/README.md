# @igojs/server

Express 5 web framework for Node.js with batteries included: ORM, templating, forms, i18n, caching, mailer, and CLI.

## Installation

```sh
npm install @igojs/server
```

## Quick Start

### Create a Project

```sh
npx igo create myproject
cd myproject
npm install
npm start
```

### Manual Setup

```javascript
const igo = require('@igojs/server');

igo.app.configure();
igo.app.run();
```

## Project Structure

```
myproject/
├── app/
│   ├── config.js          # Configuration
│   ├── routes.js          # Route definitions
│   └── controllers/       # Express controllers
├── views/                 # Dust templates
├── sql/                   # Database migrations
│   └── mysql/             # or postgresql/
├── locales/               # i18n translation files
├── assets/                # Frontend assets (JS, SCSS)
└── .env                   # Environment variables
```

## Configuration

Configuration is loaded from `app/config.js` and `.env`:

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

  config.mailer = {
    transport: { host: 'smtp.example.com', port: 587 },
    defaults: { from: 'noreply@example.com' },
  };
};
```

### Key Config Options

| Key | Description |
|-----|-------------|
| `httpport` | HTTP server port |
| `mysql` / `postgresql` | Database connection |
| `redis` | Redis connection |
| `cookieSecret` | Cookie encryption key |
| `cookieSession` | Session configuration |
| `i18n` | i18next options |
| `mailer` | Nodemailer transport config |
| `auto_migrate` | Auto-run migrations on startup |

## Routing

```javascript
// app/routes.js
const component = require('@igojs/component');

module.exports.init = (app) => {
  // Component middleware
  app.use(component.middleware);
  app.get('/__component/templates', component.templates);
  app.get('/__component/component', component.component);

  // Controllers
  app.get('/',            WelcomeController.index);
  app.get('/products',    ProductController.index);
  app.post('/products',   ProductController.create);
};
```

## Controllers

```javascript
// app/controllers/ProductController.js
const { Model } = require('@igojs/server');

class Product extends Model({
  table: 'products',
  columns: ['id', 'name', 'price', 'created_at'],
}) {}

module.exports.index = async (req, res) => {
  const products = await Product.where({ active: true }).list();
  res.render('products/index', { products });
};

module.exports.create = async (req, res) => {
  await Product.create(req.body);
  req.flash('success', 'Product created');
  res.redirect('/products');
};
```

## Models (via @igojs/db)

See [@igojs/db README](../db/README.md) for full ORM documentation.

```javascript
const { Model } = require('@igojs/server');

class User extends Model({
  table: 'users',
  columns: ['id', 'email', 'name', 'created_at'],
  associations: [
    ['has_many', 'posts', Post, 'id', 'user_id'],
  ],
}) {}

const users = await User.where({ active: true }).includes('posts').list();
```

## Forms

```javascript
const { Form } = require('@igojs/server');

class ProductForm extends Form({
  attributes: [
    { name: 'name',  type: 'string', required: true },
    { name: 'price', type: 'number', min: 0 },
    { name: 'tags',  type: 'array' },
  ]
}) {
  validate(req) {
    req.checkBody('name').notEmpty();
    req.checkBody('price').isFloat({ min: 0 });
  }
}

// In controller
module.exports.create = async (req, res) => {
  const form = new ProductForm();
  form.submit(req);

  if (form.errors) {
    return res.render('products/new', { form });
  }

  await Product.create(form.getValues());
  res.redirect('/products');
};
```

### Form API

| Method | Description |
|--------|-------------|
| `submit(req, scope?)` | Process form: sanitize, validate, convert |
| `validate(req)` | Override to add validation rules |
| `sanitize(req, scope?)` | Sanitize input values |
| `convert(req, scope?)` | Convert types (string to number, etc.) |
| `getValues()` | Get validated/converted values |
| `revert()` | Revert to submitted values (on validation error) |
| `errors` | Validation errors (null if valid) |

## Cache (Redis)

```javascript
const { cache } = require('@igojs/server');

// Store
await cache.put('products', 'featured', data, 3600); // TTL in seconds

// Retrieve
const data = await cache.get('products', 'featured');

// Fetch or compute
const data = await cache.fetch('products', 'featured', async () => {
  return await Product.where({ featured: true }).list();
}, 3600);

// Delete
await cache.del('products:featured');

// Flush by pattern
await cache.flush('products*');

// Increment counter
await cache.incr('stats', 'page_views');
```

## Mailer

```javascript
const { mailer } = require('@igojs/server');

await mailer.send('welcome', {
  to: 'user@example.com',
  subject: 'Welcome!',
  name: 'John',
});
```

Email templates in `views/emails/`:
- `views/emails/welcome.dust` — Dust template
- MJML support for responsive emails

## i18n

Built on [i18next](https://www.i18next.com/). Translations in `locales/<lang>/translation.json`:

```json
{
  "hello": "Hello {{name}}!",
  "products": {
    "title": "Products"
  }
}
```

In templates:
```dust
{@t key="hello" name=user.name /}
{@t key="products.title" /}
```

## Flash Messages

```javascript
// Set
req.flash('success', 'Item created');
req.flash('error', 'Something went wrong');

// Available in templates as {flash.success}, {flash.error}
```

## CLI Commands

```sh
# Create new project
igo create myproject

# Database
igo db migrate          # Run pending migrations
igo db seed             # Seed database
igo db reset            # Reset database

# i18n
igo i18n export         # Export translations
igo i18n import         # Import translations

# Console
igo console             # Interactive REPL with app context
```

## Exports

### Core

| Export | Description |
|--------|-------------|
| `app` | Express application (pre-configured) |
| `config` | Configuration object |
| `cache` | Redis cache API |
| `logger` | Winston logger instance |
| `express` | Express module |
| `i18next` | i18next instance |

### Database (via @igojs/db)

| Export | Description |
|--------|-------------|
| `Model(schema)` | Model class factory |
| `dbs` | Database connections manager |
| `migrations` | Migration runner |
| `CacheStats` | Cache statistics |

### Utilities

| Export | Description |
|--------|-------------|
| `Form(schema)` | Form class factory |
| `mailer` | Email sending utilities |
| `dust` | Template engine (@igojs/dust) |
| `dev` | Development tools (Vite integration) |
