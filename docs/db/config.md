
# Database Configuration

## MySQL

Default MySQL configuration:

```js
config.mysql = {
  host:            process.env.MYSQL_HOST     || '127.0.0.1',
  port:            process.env.MYSQL_PORT     || 3306,
  user:            process.env.MYSQL_USERNAME || 'root',
  password:        process.env.MYSQL_PASSWORD || '',
  database:        process.env.MYSQL_DATABASE || 'igo',
  connectionLimit: 5,   // 10 in production
  enableKeepAlive: true,
  debug:           false,
  debugsql:        false
};
```

This configuration is passed to [mysql2](https://github.com/sidorares/node-mysql2) `createPool()`. `enableKeepAlive` keeps pooled TCP connections alive to avoid drops from idle-timeout proxies/load balancers.

Enable SQL logging in development:

```js
// app/config.js
if (config.env === 'dev') {
  config.mysql.debugsql = true;
}
```

## PostgreSQL

Default PostgreSQL configuration:

```js
config.pg = {
  host:     process.env.PG_HOST     || '127.0.0.1',
  port:     process.env.PG_PORT     || 5432,
  database: process.env.PG_DATABASE || 'igo',
  user:     process.env.PG_USER     || '',
  password: process.env.PG_PASSWORD || '',
  connectionLimit: 5,   // 10 in production
  keepAlive: true,
  debugsql: false
};
```

This configuration is passed to [pg](https://node-postgres.com/) `Pool()`. `keepAlive` enables TCP keep-alive on pooled sockets to avoid drops from idle-timeout proxies/load balancers.

## Multiple Databases

Igo supports multiple database connections. Configure them in `config.databases`:

```js
// app/config.js
config.databases = ['main', 'analytics'];

config.mysql = {
  database: 'myapp',
  // ...
};

config.analytics = {
  driver:   'mysql',
  database: 'myapp_analytics',
  host:     process.env.ANALYTICS_DB_HOST || '127.0.0.1',
  // ...
};
```

Access each database at runtime:

```js
const db = require('@igojs/db');

db.dbs.main;       // Primary database
db.dbs.analytics;  // Analytics database
```

Models declare their database in the schema:

```js
const schema = {
  table:    'events',
  database: 'analytics',
  columns:  ['id', 'name', 'created_at']
};
```

If `database` is omitted, the model uses the first database (`main`).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MYSQL_HOST` | `127.0.0.1` | MySQL host |
| `MYSQL_PORT` | `3306` | MySQL port |
| `MYSQL_USERNAME` | `root` | MySQL user |
| `MYSQL_PASSWORD` | — | MySQL password |
| `MYSQL_DATABASE` | `igo` | MySQL database name |
| `PG_HOST` | `127.0.0.1` | PostgreSQL host |
| `PG_PORT` | `5432` | PostgreSQL port |
| `PG_USER` | — | PostgreSQL user |
| `PG_PASSWORD` | — | PostgreSQL password |
| `PG_DATABASE` | `igo` | PostgreSQL database name |

## Raw Queries

For queries not covered by the ORM, use `db.dbs.main.query()`:

```js
const db = require('@igojs/db');

const [rows] = await db.dbs.main.query('SELECT NOW() AS now');
```

## Transactions

The test framework wraps each test in a transaction that gets rolled back, providing per-test isolation. This relies on test-mode connection caching internal to `@igojs/db` and is not exposed as a public API in v6 — if you need to run a sequence of statements atomically outside tests, use database-side transactions through raw SQL (`BEGIN` / `COMMIT` / `ROLLBACK`).

## Standalone usage

When used inside `@igojs/server`, `@igojs/db` is wired up automatically. To use it on its own (e.g. in a script or a non-Igo project), inject the dependencies it expects:

```js
const db = require('@igojs/db');

db.init({
  config: {
    databases: ['main'],
    mysql: { host: 'localhost', database: 'myapp' },
  },
  cache:         myRedisCache,    // optional, required only for cache: true on models
  logger:        console,
  utils:         { toJSON: JSON.stringify, fromJSON: JSON.parse },
  errorhandler:  { errorSQL: (err) => console.error(err) },
});
```
