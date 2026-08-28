
# Flash Scope

The Flash scope stores data in the session for the next request only. It's useful for passing messages or form data across redirects.

## Usage

```js
// In a POST handler
app.post('/login', (req, res) => {
  req.flash('message', 'Login successful');
  req.flash('user', { id: 1, name: 'John' });
  res.redirect('/dashboard');
});
```

Flash data is available in the next request via `res.locals.flash`, then automatically cleared:

```dust
{?flash.message}
  <div class="alert">{flash.message}</div>
{/flash.message}
```

## Smart Storage

The flash middleware handles large objects automatically to prevent cookie overflow:

| Data | Storage | Behavior |
|------|---------|----------|
| < 1KB | Session cookie | Fast, no Redis needed |
| > 1KB | Redis (automatic) | UUID stored in cookie, data in Redis |
| not expressible in JSON (a cycle) | Redis (automatic) | the session is stored as JSON, Redis is not |
| > 10KB | Redis + warning | Warning logged to help identify issues |
| Redis unavailable | **dropped** | Warning logged, the value is lost for the next request |

```js
// Small data — stays in cookie
req.flash('message', 'Hello');

// Large data — automatically uses Redis
req.flash('items', largeArray);
```

::: warning Without Redis
Since `req.flash()` switches to Redis on its own past 1KB, a message a little too large
vanishes after the redirect — keep flash data small if your app must survive a Redis
outage. See [Running without Redis](/guide/development#running-without-redis).
:::

## Explicit Redis Storage

For large objects, you can explicitly use Redis-backed storage:

```js
req.cacheflash('bigdata', veryLargeObject);
```

## Awaiting the write

Redis-backed flash data is read back by the *next* request. When you redirect
straight away, await the write so it cannot lose the race:

```js
await req.flash('form', form);
res.redirect('/books');
```

Both methods return the pending write (`undefined` when the data stayed in the
session), so awaiting is always safe and only matters before a redirect.

## API

| Method | Description |
|--------|-------------|
| `req.flash(key, value)` | Store data with automatic Redis fallback. Returns the pending Redis write, if any |
| `req.cacheflash(key, value)` | Store data explicitly in Redis (60s TTL). Returns the pending write |
| `res.locals.flash` | Read flash data in templates/controllers |

## How It Works

1. **On POST** — `req.flash()` stores data in `req.session.flash`
2. If data > 1KB, it's moved to Redis with a UUID reference in the session
3. **On next GET** — Flash data is loaded into `res.locals.flash`
4. Cached flash objects are loaded from Redis in parallel
5. Flash data is cleared from the session

This prevents "header too large" errors from nginx or browsers when flashing large objects.
