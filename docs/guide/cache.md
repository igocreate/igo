
# Igo.js cache

Igo.js uses Redis as a distributed cache.

This is the default Redis configuration :
```js

var retryStrategy = function(params) {
  if (params.error.code === 'ECONNREFUSED') {
    logger.error('Redis connection refused on host ' + options.host + ':' + options.port);
    return params.error;
  }
  logger.error('Redis error ' + params.error);
  // retry in n seconds
  return params.attempt * 1000;
};

config.redis = {
  host:     process.env.REDIS_HOST      || '127.0.0.1',
  port:     process.env.REDIS_PORT      || 6379,
  database: process.env.REDIS_DATABASE  || 0,
  timeout:        null,  // no timeout by default
  no_ready_check: true,
  retry_strategy: retryStrategy
};
```

This configuration object is directly transmitted to the redis client: `redisclient = redis.createClient(config.redis);`

Use `require('igo').cache` to access the Igo.js Cache API.

```js

var cache = require('igo').cache;
var id    = 123;
cache.put('namespace', id, 'hello', function() {
  cache.get('namespace', 124, function(err, value) {
    assert(value === 'hello');
  });
});

```

## API
Available functions are:
- `get(namespace, id, callback);`
- `put(namespace, id, value, callback);`
- `fetch(namespace, id, fn, callback);`  (where fn(id, callback) is called only if key is not found in cache)
- `info(callback)`
- `del(namespace, id, callback)`
- `flushall(callback)`

## Special note about Dates
Since javascript Dates are ISO_8601 formatted and stored as strings in Redis, Igo.js automatically parses dates when they are retrieved from the cache.