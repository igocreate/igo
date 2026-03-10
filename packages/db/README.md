# @igojs/db

Active Record-style ORM for MySQL and PostgreSQL with query builder, associations, caching, and migrations.

## Installation

```sh
npm install @igojs/db
```

Database drivers are peer dependencies. Install the one you need:
```sh
npm install mysql2  # For MySQL
npm install pg      # For PostgreSQL
```

## Quick Start

### Define a Model

```javascript
const { Model } = require('@igojs/db');

const schema = {
  table: 'users',
  columns: ['id', 'email', 'name', 'created_at', 'updated_at'],
};

class User extends Model(schema) {
  fullName() {
    return `${this.first_name} ${this.last_name}`;
  }
}
```

### CRUD Operations

```javascript
// Create
const user = await User.create({ email: 'john@example.com', name: 'John' });

// Read
const user = await User.find(1);
const users = await User.where({ name: 'John' }).list();
const first = await User.first();

// Update
await user.update({ name: 'Jane' });

// Delete
await user.delete();
```

## Schema Definition

```javascript
const schema = {
  table: 'users',
  columns: [
    'id',
    'email',
    'name',
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
  cache: true,       // Enable Redis caching
  primary: ['id'],   // Composite keys supported
};
```

### Column Types

| Type | Description |
|------|-------------|
| (default) | Stored as-is |
| `boolean` | Converts `0/1` to `true/false` |
| `json` | Auto `JSON.parse`/`JSON.stringify` |

### Associations

```javascript
// has_many: ['has_many', alias, TargetModel, localKey, foreignKey]
['has_many', 'posts', Post, 'id', 'user_id']

// belongs_to: ['belongs_to', alias, TargetModel, foreignKey]
['belongs_to', 'country', Country, 'country_id']
```

## Query API

All query methods are chainable and return a Query instance. Terminal methods (`list`, `first`, `find`, `count`, `execute`) await the result.

```javascript
// Where (object or SQL string)
await User.where({ status: 'active' }).list();
await User.where('age > ?', [18]).list();
await User.whereNot({ role: 'admin' }).list();

// Chaining
const users = await User
  .where({ status: 'active' })
  .includes('posts')
  .order('name ASC')
  .limit(10)
  .offset(20)
  .list();

// Scopes
await User.scope('active').list();

// Pagination
const { pagination, rows } = await User.page(1, 20);
// pagination: { page, nb, nbPages, count }

// Aggregation
const count = await User.where({ status: 'active' }).count();

// Joins
await User.join('company', ['company.name']).list();

// Select specific columns
await User.select(['id', 'email']).list();

// Distinct / Group
await User.distinct(['country_id']).list();
await User.group(['country_id']).count();

// Eager loading
await User.includes(['posts', 'country']).list();

// Unscope (remove default scope)
await User.unscope().list();
await User.unscope('order', 'where').list();
```

### Terminal Methods

| Method | Returns |
|--------|---------|
| `list()` | Array of model instances |
| `first()` | Single instance or null |
| `last()` | Single instance or null |
| `find(id)` | Single instance or null |
| `count()` | Number |
| `page(page, perPage)` | `{ pagination, rows }` |
| `execute()` | Raw query result |
| `toSQL()` | SQL string (for debugging) |

## Model Instance Methods

| Method | Description |
|--------|-------------|
| `update(values)` | Update record (auto-sets `updated_at`) |
| `reload(includes?)` | Refresh from database |
| `delete()` | Delete record |
| `assignValues(values)` | Set values from object |
| `primaryObject()` | Get primary key as object |

### Lifecycle Hooks

```javascript
class User extends Model(schema) {
  async beforeCreate() {
    this.slug = slugify(this.name);
  }

  async beforeUpdate(values) {
    if (values.email) {
      values.email = values.email.toLowerCase();
    }
  }
}
```

## Bulk Operations

```javascript
// Update all matching
await User.where({ status: 'inactive' }).update({ archived: true });

// Delete all matching
await User.where({ status: 'inactive' }).delete();

// Delete all
await User.deleteAll();
```

## Optimized Pagination

For large tables (100K+ rows) with joins, use `PaginatedOptimizedQuery`. It runs a separate count query and ID-based pagination for better performance:

```javascript
const result = await User.paginatedOptimized()
  .where({
    status: 'active',
    'company.country.code': 'FR',
  })
  .join(['company.country'])
  .order('created_at DESC')
  .page(1, 50)
  .execute();
```

## Caching

Set `cache: true` in schema to enable Redis-based query caching. Cache is automatically flushed on INSERT, UPDATE, DELETE.

```javascript
const schema = {
  table: 'countries',
  columns: ['id', 'code', 'name'],
  cache: true,
};
```

## Migrations

SQL file-based migrations in `sql/<database>/YYYYMMDD_description.sql`:

```sql
-- sql/mysql/20240101_create_users.sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Run migrations:
```sh
igo db migrate
```

## Initialization (Standalone)

When used without @igojs/server, initialize with dependencies:

```javascript
const db = require('@igojs/db');

db.init({
  config: { mysql: { host: 'localhost', database: 'myapp' } },
  cache: myRedisCache,
  logger: myLogger,
});
```

## Exports

| Export | Description |
|--------|-------------|
| `Model(schema)` | Model class factory |
| `Query` | Query builder class |
| `CachedQuery` | Query with Redis caching |
| `Schema` | Schema definition utilities |
| `Sql` | SQL generation utilities |
| `Db` | Database connection class |
| `dbs` | Database connections manager |
| `migrations` | Migration runner |
| `DataTypes` | Column type definitions |
| `CacheStats` | Cache statistics |
| `PaginatedOptimizedQuery` | Optimized pagination |
