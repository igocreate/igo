# @igojs/db

Active Record-style ORM for [Igo.js](https://igocreate.github.io/igo). MySQL or PostgreSQL, chainable query builder, eager loading, scopes, Redis caching, SQL migrations.

## Install

```sh
npm install @igojs/db
# plus the driver you need:
npm install mysql2   # for MySQL
npm install pg       # for PostgreSQL
```

## Quick start

```js
const { Model } = require('@igojs/db');

class User extends Model({
  table:   'users',
  columns: ['id', 'email', 'name', 'created_at', 'updated_at'],
}) {}

const alice = await User.create({ email: 'alice@example.com', name: 'Alice' });
const active = await User.where({ status: 'active' }).order('name ASC').list();
const page1 = await User.page(1, 20);
```

## Documentation

Full documentation: <https://igocreate.github.io/igo/db/getting-started>

- [Getting started](https://igocreate.github.io/igo/db/getting-started)
- [Models & associations](https://igocreate.github.io/igo/db/models)
- [Query builder](https://igocreate.github.io/igo/db/queries)
- [Configuration & multi-DB](https://igocreate.github.io/igo/db/config)
- [Migrations](https://igocreate.github.io/igo/db/migrations)
- [Seeds](https://igocreate.github.io/igo/db/seeds)
- [Caching](https://igocreate.github.io/igo/db/cache)

## License

ISC
