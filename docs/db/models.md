
# Models

We were looking for a simple ORM for Node.js — something lightweight, with a clean API inspired by [Active Record](http://guides.rubyonrails.org/active_record_basics.html). We couldn't find one that fit, so we decided to see if it was hard to build... It wasn't, and @igojs/db was born!

## Model Definition

```js
const Model = require('@igojs/db').Model;

const schema = {
  table:   'users',
  columns: [
    'id',
    'email',
    'password',
    'first_name',
    'last_name',
    'created_at'
  ]
};

class User extends Model(schema) {
  name() {
    return this.first_name + ' ' + this.last_name;
  }
}

module.exports = User;
```

The `schema` object defines the table name, columns, associations, and scopes.

## Column Types

Columns can have a type for automatic conversion:

```js
const schema = {
  table:   'users',
  columns: [
    'id',
    'first_name',
    'last_name',
    { name: 'is_validated', type: 'boolean' },
    { name: 'details_json', type: 'json', attr: 'details' },
    { name: 'pets_array', type: 'array', attr: 'pets' },
  ]
};
```

| Type | Behavior |
|------|----------|
| `boolean` | Automatically cast to `true`/`false` on load |
| `json` | Stringified on write, parsed on load. Access via `attr` name. |
| `array` | Joined to CSV on write, split on load. Access via `attr` name. |

## Associations

Declare relationships in the schema with `has_many` and `belongs_to`:

```js
const Project = require('./Project');
const Country = require('./Country');

const schema = {
  table: 'users',
  columns: ['id', 'country_id', 'email'],
  associations: [
    // [type, name, Model, localKey, foreignKey]
    ['has_many',   'projects', Project, 'id', 'user_id'],
    ['belongs_to', 'country',  Country, 'country_id'],
  ]
};
```

### has_many from JSON array

`has_many` can reference an array of IDs stored as JSON:

```js
const schema = {
  table: 'users',
  columns: [
    'id',
    { name: 'projects_ids_json', type: 'json', attr: 'projects_ids' },
  ],
  associations: () => ([
    ['has_many', 'projects', require('./Project'), 'projects_ids', 'id'],
  ])
};
```

### Extra WHERE on associations

Filter associated records with an extra condition:

```js
associations: [
  ['has_many', 'active_posts', Post, 'id', 'user_id', { active: true }],
]
```

See [Queries](./queries.md) for loading associations with `includes()` and `join()`.

## Scopes

Scopes add default query conditions:

```js
const schema = {
  table: 'users',
  columns: ['id', 'email', 'status', 'created_at'],
  scopes: {
    default:   (query) => { query.order('`created_at` DESC'); },
    active:    (query) => { query.where({ status: 'active' }); },
  }
};
```

The `default` scope applies to all queries, including when using `.scope()` — named scopes stack on top of the default scope.

```js
// default + active scopes both apply
const users = await User.scope('active').list();

// Remove all scopes (including default)
const all   = await User.unscope().list();

// Remove only the includes added by the default scope
const users = await User.unscope('includes').list();

// Replace default includes with specific ones
const users = await User.unscope('includes').includes('profile').list();
```

## API Reference

### Static Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `Model.create(values)` | `instance` | Insert a new record |
| `Model.find(id)` | `instance \| null` | Find by primary key |
| `Model.first()` | `instance \| null` | First record (respects default scope) |
| `Model.last()` | `instance \| null` | Last record (respects default scope) |
| `Model.list()` | `[instance, ...]` | All records |
| `Model.count()` | `number` | Count records |
| `Model.delete(id)` | — | Delete by primary key |
| `Model.deleteAll()` | — | Delete all records |
| `Model.update(values)` | — | Update all records |
| `Model.where(conditions)` | `Query` | Filter records (see [Queries](./queries.md)) |
| `Model.whereNot(conditions)` | `Query` | Exclude records |
| `Model.select(columns)` | `Query` | Custom SELECT |
| `Model.distinct(columns)` | `Query` | Distinct values |
| `Model.group(columns)` | `Query` | GROUP BY |
| `Model.order(clause)` | `Query` | ORDER BY |
| `Model.limit(n)` | `Query` | Limit results |
| `Model.offset(n)` | `Query` | Skip results |
| `Model.page(page, perPage)` | `Query` | Paginate |
| `Model.includes(assocs)` | `Query` | Eager load associations |
| `Model.join(assocs)` | `Query` | SQL JOIN |
| `Model.scope(name)` | `Query` | Apply named scope |
| `Model.unscope(...clauses)` | `Query` | Remove all scopes (no args) or specific clauses |

### Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `instance.update(values)` | — | Update this record |
| `instance.delete()` | — | Delete this record |
| `instance.reload(includes?)` | — | Refresh from database |

## CRUD

### Create

```js
const user = await User.create({
  first_name: 'John',
  last_name:  'Doe',
});
// => User { id: 1, first_name: 'John', last_name: 'Doe', ... }
```

If the primary key is `AUTO_INCREMENT`, it is set automatically on the returned instance.

`create(values, options)` accepts a second argument forwarded to the underlying driver query (`silent`, etc. — see the [config](./config.md) page).

### Find

```js
const user = await User.find(id);
// Returns null if not found
```

### First / Last

```js
const user = await User.first();
const user = await User.last();
const user = await User.where({ status: 'active' }).first();
```

### List

```js
const users = await User.list();
const users = await User.where({ status: 'active' }).list();
```

### Count

```js
const total  = await User.count();
const active = await User.where({ status: 'active' }).count();
```

### Update

```js
// Update a single instance
const user = await User.find(id);
await user.update({ first_name: 'Jim' });

// Bulk update
await User.where({ country: 'France' }).update({ language: 'French' });

// Update all
await User.update({ status: 'inactive' });
```

### Delete

```js
// Delete by ID
await User.delete(id);

// Delete an instance
const user = await User.find(id);
await user.delete();

// Bulk delete
await User.where({ status: 'banned' }).delete();

// Delete all
await User.deleteAll();
```

### Reload

Refresh an instance from the database:

```js
const user = await User.find(id);
await user.reload();

// Reload with associations
await user.reload('country');
```

## Hooks

Override `beforeCreate` and `beforeUpdate` for custom logic:

```js
class User extends Model(schema) {
  async beforeCreate() {
    this.created_at = new Date();
  }

  async beforeUpdate(values) {
    values.updated_at = new Date();
  }
}
```

## Single Table Inheritance

Support polymorphic models via `subclass_column`:

```js
const schema = {
  table: 'users',
  columns: ['id', 'type', 'email'],
  subclass_column: 'type',
  subclasses: () => ({
    admin: require('./AdminUser'),
    user:  require('./RegularUser'),
  }),
};
```

Queries automatically return the correct subclass based on the `type` column.
