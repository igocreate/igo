
# Query Builder

All query methods are chainable and return a `Query` instance. Call `.list()`, `.first()`, `.last()`, or `.count()` to execute.

## Where

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

### whereNot

```js
const users = await User.whereNot({ status: 'banned' }).list();
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
// Apply a named scope
const users = await User.scope('active').list();

// Remove default scope
const users = await User.unscoped().list();
```

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

## SQL Debugging

Get the generated SQL for a query:

```js
const sql = User.where({ status: 'active' }).order('created_at DESC').toSQL();
console.log(sql);
```
