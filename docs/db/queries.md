
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

```js
const result = await User.page(1, 25).list();

result.pagination;
// {
//   page: 1,
//   nb: 25,
//   previous: null,
//   next: 2,
//   nb_pages: 4,
//   count: 100,
//   links: [...]
// }

result.rows;
// [User, User, ...]
```

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
```

Supported clauses: `where`, `whereNot`, `order`, `includes`, `joins`, `select`, `distinct`, `group`, `limit`, `offset`.

## First / Last

```js
const user = await User.first();
const user = await User.last();
const user = await User.where({ status: 'active' }).first();
```

## Update / Delete

```js
// Bulk update
await User.where({ country: 'France' }).update({ language: 'French' });

// Bulk delete
await User.where({ status: 'banned' }).delete();
```

## Performance Optimization

When a query uses `.page()` with `.join()`, Igo.js automatically applies the **COUNT/IDS/FULL pattern** for better performance on large tables:

1. **COUNT** with `EXISTS` subqueries (no LEFT JOIN)
2. **SELECT IDs** only, with filters and pagination
3. **SELECT full data** with LEFT JOIN on the found IDs only

This replaces the standard approach (COUNT + SELECT with full LEFT JOINs) which becomes slow on large tables with many joins.

```js
// Automatically optimized: page + join detected
const result = await Folder
  .where({ type: ['agp', 'avt'], status: 'SUBMITTED' })
  .join(['applicant', 'pme_folder'])
  .order('folders.created_at DESC')
  .page(1, 50)
  .list();
// Uses EXISTS for COUNT, deferred joins for SELECT
```

| Scenario | Standard | Optimized | Gain |
|----------|----------|-----------|------|
| 100K rows, 3 joins | 500ms | 20ms | 25x |
| 1M rows, 5 joins | 3s | 50ms | 60x |
| 2M rows, 10 joins | 10s | 100ms | 100x |

The optimization activates automatically when both conditions are met:
- `.page()` is called (pagination requested)
- `.join()` is called (at least one join present)

Without joins, the standard 2-query approach (COUNT + SELECT) is used, which is more efficient for simple queries.


## SQL Debugging

Get the generated SQL for a query:

```js
const sql = User.where({ status: 'active' }).order('created_at DESC').toSQL();
console.log(sql);
```
