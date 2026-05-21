
# Query Builder

All query methods are chainable and return a `Query` instance. Call `.list()`, `.first()`, `.last()`, or `.count()` to execute.

## Where

### Basic syntax

```js
// Object syntax
const users = await User.where({ status: 'active' }).list();

// Array values use IN
const users = await User.where({ status: ['active', 'pending'] }).list();

// NULL values use IS NULL
const users = await User.where({ deleted_at: null }).list();

// Raw SQL
const users = await User.where('`last_name` IS NOT NULL').list();

// Raw SQL with params
const users = await User.where('`created_at` BETWEEN ? AND ?', [date1, date2]).list();
```

### Operators

Object values can use MongoDB-style operators for advanced comparisons:

```js
// IN (array)
const users = await User.where({ status: ['active', 'pending'] }).list();

// IS NULL
const users = await User.where({ deleted_at: null }).list();

// $like - LIKE
const users = await User.where({ last_name: { $like: 'Dup%' } }).list();

// $between - range
const users = await User.where({ created_at: { $between: ['2024-01-01', '2024-12-31'] } }).list();

// $gte, $lte, $gt, $lt - comparisons
const users = await User.where({ age: { $gte: 18 } }).list();
const users = await User.where({ age: { $lt: 65 } }).list();
```

Operators work everywhere `where()` is used: `select`, `update`, `delete`, `count`.

```js
// delete with operator
await User.where({ created_at: { $lt: '2020-01-01' } }).delete();

// count with operator
const count = await User.where({ price: { $between: [10, 50] } }).count();
```

### Logical operators

```js
// $or - at least one condition must be true
const users = await User.where({
  $or: [{ status: 'active' }, { role: 'admin' }]
}).list();

// $and - all conditions must be true (explicit, usually implicit)
const users = await User.where({
  $and: [{ age: { $gte: 18 } }, { age: { $lt: 65 } }]
}).list();

// $or combined with other conditions
const users = await User.where({
  $or: [{ status: 'active' }, { status: 'pending' }],
  type: 'premium'
}).list();
```

> **Note:** Multiple keys in the same object are implicitly AND-ed. Use `$and` only when you need to combine multiple conditions on the same key, or for readability.

### whereNot

`whereNot()` also supports operators (they are automatically inverted):

```js
// != 'deleted'
const users = await User.whereNot({ status: 'deleted' }).list();

// NOT IN
const users = await User.whereNot({ role: ['banned', 'suspended'] }).list();

// NOT LIKE (inverted $like)
const users = await User.whereNot({ email: { $like: '%@spam.com' } }).list();

// < 18 (inverted $gte)
const users = await User.whereNot({ age: { $gte: 18 } }).list();
```

## Select

```js
// Specific columns
const users = await User.select('id, first_name').list();

// With SQL expressions
const users = await User.select('*, YEAR(created_at) AS `year`').list();
```

## Order, Limit, Offset

```js
const users = await User.order('`created_at` DESC').limit(10).list();
const users = await User.order('`last_name` ASC').limit(10).offset(20).list();
```

## Distinct

```js
const names = await User.distinct('first_name').list();
const names = await User.distinct(['first_name', 'last_name']).list();
```

## Group By

```js
const stats = await User
  .select('COUNT(*) AS `count`, YEAR(created_at) AS `year`')
  .group('year')
  .list();
```

## Count

```js
const total = await User.count();
const active = await User.where({ status: 'active' }).count();
```

## Pagination

`page(pageNumber, perPage)` — both arguments are 1-based for `pageNumber`. Defaults to no pagination when not called.

```js
// page 1 (the first page), 25 results per page
const result = await User.page(1, 25).list();

result.pagination;
// {
//   page:      1,    // current page number
//   nb:        25,   // results per page
//   previous:  null, // previous page number, or null on page 1
//   next:      2,    // next page number, or null on the last page
//   nb_pages:  4,    // total number of pages
//   count:     100,  // total number of matching rows
//   links:     [...] // array of page numbers, useful for rendering pagers
// }

result.rows;
// [User, User, ...]
```

Combine with filters and ordering as usual:

```js
const { pagination, rows } = await User
  .where({ status: 'active' })
  .order('created_at DESC')
  .page(req.query.page || 1, 50)
  .list();
```

When `.page()` is used together with `.join()`, an [optimized COUNT/IDS/FULL pattern](./optimized-pagination) is applied automatically.

## Includes (Eager Loading)

`includes()` loads associated records in separate queries (one per association type), avoiding N+1 problems.

```js
// Single association
const users = await User.includes('country').list();

// Multiple associations
const users = await User.includes(['country', 'projects']).list();

// Nested associations
const users = await User.includes({ projects: ['lead', 'tasks'] }).list();

// Mixed
const users = await User.includes(['country', { projects: 'lead' }]).list();
```

Reload an instance with associations:

```js
const user = await User.find(id);
await user.reload('country');
console.log(user.country.name);
```

## Joins

`join()` loads associated data in a single SQL query with a LEFT JOIN. The association must be declared in the schema.

```js
// Simple join
const user = await User.join('country').first();
console.log(user.country.name);

// Join with specific columns
const user = await User.join('country', ['code']).first();
console.log(user.country.code);

// Join type: 'left' (default), 'inner', 'right'
const users = await User.join('country', null, 'inner').list();

// Multiple joins
const users = await User.join(['country', 'company']).list();

// Nested joins
const users = await User.join({ company: 'country' }).list();
const users = await User.join({ company: { country: 'continent' } }).list();
```

### Joins + Includes

Combine for different loading strategies:

```js
const book = await Book.join('library').includes('library.city').find(id);
// library loaded via JOIN, city loaded via separate query
```

### Join with WHERE

```js
const count = await Book.join('library').where('library.title = ?', 'Main').count();
```

## Scopes

```js
// Apply a named scope (stacks on top of the default scope)
const users = await User.scope('active').list();

// Remove all scopes (including default)
const users = await User.unscope().list();

// Remove specific clauses added by scopes
const users = await User.unscope('where').list();
const users = await User.unscope('includes').list();
const users = await User.unscope('where', 'order').list();

// Replace default includes with specific ones
const users = await User.unscope('includes').includes('profile').list();
```

Supported clauses: `where`, `whereNot`, `order`, `includes`, `joins`, `select`, `distinct`, `group`, `limit`, `offset`.

## First / Last / Find

```js
const user = await User.first();
const user = await User.last();
const user = await User.where({ status: 'active' }).first();

// Lookup by primary key — bypasses the default scope
const user = await User.find(42);

// Pass an array of ids to fetch several at once; returns an array
const users = await User.find([1, 2, 3]);
```

## Create

```js
const user = await User.create({
  email: 'alice@example.com',
  first_name: 'Alice'
});
// → User { id: 1, email: 'alice@example.com', first_name: 'Alice', created_at: …, updated_at: … }
```

`created_at` and `updated_at` are set automatically. The returned instance has the auto-generated primary key set.

`create(values, options)` accepts a second argument forwarded to the driver — notably `silent: true` to swallow query errors and return `null` instead of throwing (useful for `INSERT IGNORE`-style attempts).

The `beforeCreate()` lifecycle hook runs first — see [Models › Hooks](./models#hooks).

## Update

Three patterns, depending on what you have in hand:

```js
// 1. Instance update — the most common case
const user = await User.find(id);
await user.update({ email: 'new@example.com' });
// updated_at is set automatically; beforeUpdate(values) hook runs first

// 2. Bulk update — apply to all matching rows
await User.where({ country: 'France' }).update({ language: 'French' });

// 3. Update all rows
await User.update({ status: 'inactive' });
```

The instance form returns the same instance with the new values assigned. Bulk updates skip lifecycle hooks (no per-row `beforeUpdate`).

## Delete

```js
// 1. Instance delete
const user = await User.find(id);
await user.delete();

// 2. Delete by primary key
await User.delete(id);

// 3. Bulk delete by criteria
await User.where({ status: 'banned' }).delete();

// 4. Delete all rows
await User.deleteAll();
```

## Reload

Refresh an instance from the database — handy after a bulk update touched it, or to load associations after the fact:

```js
const user = await User.find(id);
await user.reload();

// Reload with associations
await user.reload('country');
await user.reload(['country', 'projects']);
```

## Optimized pagination

Paginated queries with joins automatically use a COUNT/IDS/FULL pattern that avoids `LEFT JOIN` row multiplication. See [Optimized pagination](./optimized-pagination) for details and the `Model.paginatedOptimized()` opt-in.

## Advanced

### `from(table)` — override the table

Run the same model against a different table — useful for views, sharded tables, or running a one-off query without declaring a separate model:

```js
const users = await User.from('users_archive').where({ status: 'inactive' }).list();
```

### `options(opts)` — driver options

Forward an options object to the underlying driver `query()`. The most useful is `silent: true`, which swallows query errors and returns `null` instead of throwing — handy for tolerant `INSERT IGNORE`-style operations:

```js
await User.options({ silent: true }).where({ email: 'dup@example.com' }).first();
// → returns null instead of throwing on a bad query
```

### `execute()` — manual run

`list()`, `first()`, `count()`, etc. all call `execute()` internally. You usually don't need to call it yourself, but it's the terminal method when you're combining chains explicitly — for example with `paginatedOptimized()`:

```js
const result = await Folder.paginatedOptimized()
  .where({ status: 'SUBMITTED' })
  .join('applicant')
  .page(1, 50)
  .execute();
```

## SQL Debugging

Get the generated SQL for a query:

```js
const sql = User.where({ status: 'active' }).order('created_at DESC').toSQL();
console.log(sql);
```
