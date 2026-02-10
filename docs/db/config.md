
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
  debug:           false,
  debugsql:        false
};
```

This configuration is passed to [mysql2](https://github.com/sidorares/node-mysql2) `createPool()`.

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
  debugsql: false
};
```

This configuration is passed to [pg](https://node-postgres.com/) `Pool()`.

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

```js
const db = require('@igojs/db');
const connection = await db.dbs.main.beginTransaction();

try {
  await db.dbs.main.query('INSERT INTO users ...', [], { connection });
  await db.dbs.main.query('INSERT INTO profiles ...', [], { connection });
  await db.dbs.main.commitTransaction(connection);
} catch (err) {
  await db.dbs.main.rollbackTransaction(connection);
  throw err;
}
```
