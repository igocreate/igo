
# Query Caching

@igojs/db integrates with Redis to cache query results. When caching is enabled on a model, SELECT queries are cached and automatically invalidated on writes.

## Setup

Enable caching on a model by adding `cache` to the schema:

```js
const schema = {
  table:   'users',
  columns: ['id', 'email', 'first_name', 'last_name'],
  cache:   { ttl: 3600 }  // Cache for 1 hour (in seconds)
};

class User extends Model(schema) {}
```

Redis must be configured and running (see [Server Cache](/server/cache)).

## How It Works

When `cache` is set in the schema, the model uses `CachedQuery` instead of `Query`:

1. **On SELECT** — the query SQL + params are hashed as a cache key. If found in Redis, the cached result is returned. Otherwise, the query runs and the result is stored with the configured TTL.

2. **On INSERT/UPDATE/DELETE** — all cached entries for that model's table are flushed.

```js
// First call: hits the database, stores result in Redis
const users = await User.where({ status: 'active' }).list();

// Second call: served from Redis cache
const users = await User.where({ status: 'active' }).list();

// This flushes the User cache
await User.create({ email: 'new@example.com' });

// Next call hits the database again
const users = await User.where({ status: 'active' }).list();
```

## Cache Keys

Cache entries are stored under the namespace `_cached.{table_name}`. The individual cache key is the JSON-stringified SQL and params:

```
_cached.users → {"sql": "SELECT * FROM users WHERE status = ?", "params": ["active"]}
```

## Cache Statistics

Track cache performance with `CacheStats`:

```js
const { CacheStats } = require('@igojs/db');

const stats = await CacheStats.getStats();
// [
//   { table: 'users', hits: 1050, misses: 250, total: 1300, rate: 81 },
//   { table: 'projects', hits: 500, misses: 100, total: 600, rate: 83 },
// ]
```

## When to Use

Caching is useful for:
- Read-heavy tables with infrequent writes (countries, categories, settings...)
- Expensive queries that are repeated often
- Data that can tolerate short staleness

Avoid caching on tables with frequent writes, as each write flushes the entire table cache.
