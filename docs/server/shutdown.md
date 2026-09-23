# Shutdown

On `SIGTERM` and `SIGINT`, igo closes what the application holds instead of
letting the process die where it stands: the requests being served finish, the
database pools are released, and the project gets a callback to close its own
resources.

`app.run()` installs the handlers. Nothing else does — a CLI command or a
script has nothing to keep alive, and the test environment installs none at all,
or mocha would never get its hand back.

## Order

```
SIGTERM / SIGINT
  1. readiness answers 503        the load balancer stops routing here
     wait config.shutdownDelay
  2. HTTP server closes           no new connection, the current ones finish
  3. config.onShutdown()          the project's own shutdown
  4. databases released
  5. cache disconnected
```

The project callback runs **after** the server, so nothing is still being
served once it starts releasing what a request might need, and **before** the
database and the cache, which it may still want to use.

## The project callback

```js
// app/config.js
module.exports.init = (config) => {
  config.onShutdown = async () => {
    await browserPool.drain();
    await stopTelemetry();
  };
};
```

This is the single hook. A module with its own resources to release is called
from here rather than adding its own `process.on('SIGTERM')` — two handlers on
the same signal do not wait for each other, and whichever calls `process.exit()`
first takes the rest of the shutdown with it.

A rejection is logged and the shutdown carries on to the database and the cache:
a pool that failed to drain is no reason to lose the connections that would have
been released next.

An uncaught exception does not go through this shutdown: see
[`config.onCrash`](./errors.md#flushing-telemetry-before-the-exit).

## Settings

| | Default | |
|---|---|---|
| `config.shutdownDelay` | `0` | Between readiness answering 503 and the socket closing |
| `config.shutdownTimeout` | `10000` | Ceiling on the whole shutdown, after which the process exits 1 |

`shutdownDelay` is what gives a load balancer time to take the instance out
before it stops accepting connections. Without one it is dead time, hence the
`0` default; behind one, set it above the health check interval:

```js
config.shutdownDelay = 5000;
```

Both delays are spent before the process manager's own patience runs out, so
its kill timeout has to exceed their sum — pm2 defaults to 1600 ms, which is
below both:

```js
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'myapp',
    kill_timeout: 20000,   // > shutdownDelay + shutdownTimeout
  }],
};
```

A second signal exits immediately with code 1, which is what a second `Ctrl-C`
is asking for.

## Without a server

A cron or a script that calls `app.configure()` has no signal to wait for, and
the database pool keeps the process alive once the work is done. Close it
explicitly:

```js
const { app } = require('@igojs/server');

await app.configure();
await doTheWork();
await app.shutdown();
```

`app.shutdown()` never rejects and runs once, whatever calls it.

## After the shutdown

A query issued after the databases are released — a forgotten `setInterval`, a
callback arriving late — is rejected rather than reopening the pool:

```
Error: Db 'main' is closed: the application is shutting down.
```

Reopening would keep the process alive past the shutdown that just closed it.
The error names the database, which is usually enough to find the timer nobody
cleared.
