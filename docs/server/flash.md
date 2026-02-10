
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

| Data size | Storage | Behavior |
|-----------|---------|----------|
| < 1KB | Session cookie | Fast, no Redis needed |
| > 1KB | Redis (automatic) | UUID stored in cookie, data in Redis |
| > 10KB | Redis + warning | Warning logged to help identify issues |

```js
// Small data — stays in cookie
req.flash('message', 'Hello');

// Large data — automatically uses Redis
req.flash('items', largeArray);
```

## Explicit Redis Storage

For large objects, you can explicitly use Redis-backed storage:

```js
req.cacheflash('bigdata', veryLargeObject);
```

## API

| Method | Description |
|--------|-------------|
| `req.flash(key, value)` | Store data with automatic Redis fallback |
| `req.cacheflash(key, value)` | Store data explicitly in Redis (60s TTL) |
| `res.locals.flash` | Read flash data in templates/controllers |

## How It Works

1. **On POST** — `req.flash()` stores data in `req.session.flash`
2. If data > 1KB, it's moved to Redis with a UUID reference in the session
3. **On next GET** — Flash data is loaded into `res.locals.flash`
4. Cached flash objects are loaded from Redis in parallel
5. Flash data is cleared from the session

This prevents "header too large" errors from nginx or browsers when flashing large objects.
