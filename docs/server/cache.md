
# Cache

Igo.js uses Redis as a distributed cache.

## Configuration

```js
config.redis = {
  socket: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
  },
  database: process.env.REDIS_DATABASE || 0,
};
```

## Usage

```js
const { cache } = require('@igojs/server');

// Store a value (with optional TTL in seconds)
await cache.put('users', 'user:123', { name: 'John' }, 3600);

// Retrieve a value
const user = await cache.get('users', 'user:123');
// => { name: 'John' } or null

// Fetch: get from cache, or compute and store
const data = await cache.fetch('expensive', 'result', async () => {
  return await expensiveComputation();
}, 1800);

// Delete
await cache.del('users', 'user:123');

// Increment a counter
await cache.incr('stats', 'page_views');

// Flush by pattern
await cache.flush('users/*');

// Flush everything
await cache.flushall();
```

## API

| Method | Description |
|--------|-------------|
| `get(namespace, id)` | Get a cached value (returns `null` if not found) |
| `put(namespace, id, value, timeout?)` | Store a value with optional TTL (seconds) |
| `fetch(namespace, id, fn, timeout?)` | Get or compute and cache |
| `del(namespace, id)` | Delete a cached value |
| `incr(namespace, id)` | Increment a counter |
| `flush(pattern)` | Delete keys matching pattern (e.g. `users/*`) |
| `scan(pattern, fn)` | Iterate over keys matching pattern |
| `flushdb()` | Flush current database |
| `flushall()` | Flush all databases |
| `info()` | Redis server info |

## Key Format

Keys are stored as `namespace/id`. For example, `cache.get('users', 'user:123')` reads the key `users/user:123`.

## Serialization

- **Objects** are serialized to JSON
- **Buffers** are stored as base64
- **Dates** in JSON are automatically parsed back to `Date` objects on retrieval
