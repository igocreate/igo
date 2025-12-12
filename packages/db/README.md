# @igo/db

Database abstraction layer for MySQL and PostgreSQL with Active Record-style ORM.

## Installation

```sh
npm install @igo/db
```

**Note:** Database drivers are optional dependencies. Install the one you need:
```sh
npm install mysql2  # For MySQL
npm install pg      # For PostgreSQL
```

## Features

- **Active Record ORM** - Ruby on Rails-inspired Model API
- **Query Builder** - Chainable query API with scopes
- **Associations** - has_many, belongs_to relationships
- **Caching** - Redis-based query result caching
- **Migrations** - SQL file-based migrations
- **Optimized Queries** - PaginatedOptimizedQuery for large tables

## Quick Start

```javascript
const { Model } = require('@igo/db');

const schema = {
  table: 'users',
  columns: ['id', 'email', 'name', 'created_at']
};

class User extends Model(schema) {
  fullName() {
    return `${this.first_name} ${this.last_name}`;
  }
}

// CRUD operations
const user = await User.create({ email: 'john@example.com', name: 'John' });
const users = await User.where({ name: 'John' }).list();
await user.update({ name: 'Jane' });
await user.delete();
```

## API

### Exports

| Export | Description |
|--------|-------------|
| `Model` | Base model class factory |
| `Query` | Query builder class |
| `CachedQuery` | Query with Redis caching |
| `Schema` | Schema definition utilities |
| `Sql` | SQL generation utilities |
| `Db` | Database connection class |
| `dbs` | Database connections manager |
| `migrations` | Migration runner |
| `DataTypes` | Column type definitions |
| `CacheStats` | Cache statistics |
| `PaginatedOptimizedQuery` | Optimized pagination for large tables |

### Model Definition

```javascript
const schema = {
  table: 'users',
  columns: [
    'id',
    'email',
    { name: 'is_active', type: 'boolean' },
    { name: 'settings_json', type: 'json', attr: 'settings' },
  ],
  associations: [
    ['has_many', 'posts', Post, 'id', 'user_id'],
    ['belongs_to', 'country', Country, 'country_id'],
  ],
  scopes: {
    default: (q) => q.order('created_at DESC'),
    active: (q) => q.where({ is_active: true }),
  },
  cache: true, // Enable Redis caching
};
```

### Query API

```javascript
// Find
const user = await User.find(1);

// Where
const users = await User.where({ status: 'active' }).list();
const users = await User.where('age > ?', [18]).list();

// Chainable
const users = await User
  .where({ status: 'active' })
  .includes('posts')
  .order('name ASC')
  .limit(10)
  .list();

// Scopes
const users = await User.scope('active').list();

// Pagination
const result = await User.page(1, 20);
// => { pagination: {...}, rows: [...] }

// Count
const count = await User.where({ status: 'active' }).count();
```

### Optimized Pagination

For large tables with many joins (100K+ rows), use `PaginatedOptimizedQuery`:

```javascript
const result = await User.paginatedOptimized()
  .where({
    status: 'active',
    'company.country.code': 'FR',  // Nested filter
  })
  .join(['company.country'])
  .order('created_at DESC')
  .page(1, 50)
  .execute();
```

## Initialization

When used standalone (without @igo/server), initialize with dependencies:

```javascript
const db = require('@igo/db');

db.init({
  config: { mysql: { host: 'localhost', database: 'myapp' } },
  cache: myRedisCache,
  logger: myLogger,
  utils: { toJSON, fromJSON },
  errorhandler: myErrorHandler,
});
```

## Documentation

See the [full documentation](https://igocreate.github.io/igo/#/db/models).
