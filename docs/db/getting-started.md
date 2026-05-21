
# Igo DB

## Introduction

We were looking for a simple ORM for Node.js — something lightweight, with a clean API inspired by [Active Record](https://guides.rubyonrails.org/active_record_basics.html). We couldn't find one that fit, so we decided to see if it was hard to build. It wasn't, and `@igojs/db` was born.

It's deliberately small: no model generation, no DSL for migrations, no opaque magic. Schemas are plain JavaScript objects, migrations are SQL files, and the query builder reads like the SQL it produces.

### Key Features

* **Active Record-style API** — `User.where(...).includes(...).list()` reads as you'd write it
* **MySQL and PostgreSQL** — driver auto-selected per database, including pooling and `enableKeepAlive` by default
* **Chainable query builder** — `where`, `whereNot`, `select`, `order`, `limit`, `offset`, `group`, `distinct`, `page`, `count`
* **MongoDB-style operators** — `$like`, `$between`, `$gte`, `$lte`, `$gt`, `$lt`, `$or`, `$and` (with explicit errors on unknown operators)
* **Associations** — `has_many` and `belongs_to`, including from JSON-array foreign keys
* **Eager loading & joins** — `.includes(...)` for separate queries, `.join(...)` for SQL JOIN, freely composable
* **Scopes** — default + named, stackable, with `unscope()` for fine-grained removal
* **Optimized pagination** for large tables — automatic COUNT/IDS/FULL pattern on paginated queries with joins (100× gains on big tables)
* **Redis-backed query caching** — per-model opt-in, automatic invalidation on writes
* **SQL migrations** — file-based (`sql/YYYYMMDD_*.sql`), advisory-locked, idempotent
* **Seeds** — numbered `.js` files run via `igo db seed` (blocked in production)

## Quick Start

Define a model:

```js
const { Model } = require('@igojs/db');

class User extends Model({
  table:   'users',
  columns: ['id', 'email', 'first_name', 'last_name', 'created_at', 'updated_at'],
}) {
  fullName() {
    return `${this.first_name} ${this.last_name}`;
  }
}
```

CRUD and queries:

```js
const user   = await User.create({ email: 'alice@example.com', first_name: 'Alice' });
const found  = await User.find(user.id);
const active = await User.where({ status: 'active' }).order('created_at DESC').list();
const { pagination, rows } = await User.page(1, 25);

await user.update({ first_name: 'Alicia' });
await user.delete();
```

When used through `@igojs/server`, the connection pool, error handler, cache and migrations are wired up automatically. For standalone use, inject dependencies via `db.init({...})` — see [Configuration › Standalone usage](./config#standalone-usage).

## Next steps

* **[Models](./models)** — Schemas, types, associations, scopes, hooks
* **[Query builder](./queries)** — `where`, operators, joins, includes, pagination
* **[Optimized pagination](./optimized-pagination)** — When and how the COUNT/IDS/FULL pattern kicks in
* **[Configuration](./config)** — MySQL, PostgreSQL, multi-database setup
* **[Migrations](./migrations)** — SQL files, runner, advisory locks
* **[Seeds](./seeds)** — Bootstrapping development and test data
* **[Query caching](./cache)** — Redis-backed cache and statistics
