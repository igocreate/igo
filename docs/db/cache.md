# Query Caching

@igojs/db integrates with Redis to cache query results. When caching is enabled on a model, read queries are cached and automatically invalidated on writes.

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

`cache: true` is also accepted as a shorthand — the TTL then falls back to the default of one hour.

Redis must be configured and running (see [Server Cache](/server/cache)).

## How It Works

When `cache` is set in the schema, the model uses `CachedQuery` instead of `Query`.

Invalidation is **version-based**: nothing is ever deleted or scanned. Each table has a version counter in Redis, and every cache entry is stamped with the versions of the tables it was built from. An entry whose stamp no longer matches the current versions is simply a miss. This is the same approach as Hibernate's query spaces and Doctrine's timestamp region.

1. **On SELECT / COUNT** — the entry and the table versions are read in a single round trip. If the entry exists and its stamp matches, it is returned. Otherwise the query runs and the result is stored, stamped with the versions read *before* the query ran.

2. **On INSERT / UPDATE / DELETE** — a single `INCR` bumps the table version. Every cached read on that table becomes stale at once.

```js
// First call: hits the database, stores the stamped result in Redis
const users = await User.where({ status: 'active' }).list();

// Second call: served from Redis
const users = await User.where({ status: 'active' }).list();

// This bumps the users version
await User.create({ email: 'new@example.com' });

// The stamp no longer matches: hits the database again
const users = await User.where({ status: 'active' }).list();
```

Because the stamp is taken before the query runs, a result that lands in the cache late — after a concurrent write — is stamped with an already-outdated version, so it is rejected on the next read instead of being served until it expires.

## Joins

A query with joins depends on every table it touches, and its entry is stamped with all of their versions. A write to any of them invalidates it.

This only works if the joined models are themselves cached: a write on a model without `cache` goes through the plain `Query` and never bumps a version. A query joining an uncached model is therefore **not cached at all** — it always hits the database.

```js
class Country extends Model({ table: 'countries', cache: true, /* ... */ }) {}

// cached: stamped with both the users and countries versions
await User.query().join('country').list();
```

## Paginated Queries

A paginated query with joins runs through a three-phase `COUNT` / `IDS` / `FULL` strategy instead of a single statement. All three phases are cached and stamped the same way, so the whole page is served from Redis on a hit, and any write to any of the tables involved invalidates it.

## Cache Keys

Entries are stored under the namespace `_cached.{table_name}`, keyed by the JSON-stringified SQL and params:

```
_cached.users → {"sql":"SELECT * FROM users WHERE status = ?","params":["active"]}
```

Table versions live under `_cached_versions/{table_name}`.

## Redis Configuration

Two invariants matter:

- **Set `maxmemory-policy allkeys-lru`.** Invalidated entries are never read again, so they are exactly the LRU tail — Redis reclaims them at the right time, with no cleanup code and no key scanning.
- **Version keys must never expire.** If `_cached_versions/{table}` disappears, the counter restarts at zero and revalidates any stale entry still stamped with version 0. `cache.incr` deliberately sets no TTL; do not add a global expiry that would cover these keys.

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

Hits and misses are counted in memory, and written to Redis at most once every 30
seconds, by the queries themselves — no query ever pays for a counter round trip.
`getStats()` flushes the pending counters before reading, so the numbers it returns
are always up to date. A process that stops therefore loses at most its last 30
seconds of counters.

## When to Use

Caching is useful for:
- Read-heavy tables with infrequent writes (countries, categories, settings...)
- Expensive queries that are repeated often
- Data that can tolerate short staleness

Avoid caching tables with frequent writes: invalidation is table-wide, so every write invalidates every cached read on that table.
