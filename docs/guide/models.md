
# Igo.js Model API

The Igo.js Model API for MySQL is the only part of Igo.js that is not just the integration of another module.
As you will notice, the syntax was very inspired by [Ruby on Rails Active Record](http://guides.rubyonrails.org/active_record_basics.html).

## MySQL Configuration

This is the default MySQL configuration (`config.mysql`) defined by Igo.js:
```
config.mysql = {
  host     : process.env.MYSQL_HOST     || '127.0.0.1',
  port     : process.env.MYSQL_PORT     || 3306,
  user     : process.env.MYSQL_USERNAME || 'root',
  password : process.env.MYSQL_PASSWORD || '',
  database : process.env.MYSQL_DATABASE || 'igo',
  debug    : false,     // mysql driver debug mode
  connectionLimit : 5,
  debugsql : false      // show sql logs
};
```

This configuration is given to the [node.js driver for mysql](https://github.com/mysqljs/mysql) `mysql.createPool(config.mysql)` function, to initialize the connection pool.

You can override this configuration in your `/app/config.js` file:
```js
if (config.env === 'dev') {
  // show sql logs
  config.mysql.debugsql = true;
}
```


## Migrations

All the SQL files should be placed in the `/sql` directory, and will be played in the alphabetical order.
The SQL files names must follow this pattern: `YYYYMMDD-*.sql`.

To run the migrations, use:
```js
require('igo').dbs.mysql.migrate();
```

When a migration file has run successfully, it is saved in a `__db_migrations` table so it will not run again next time. (This table is automatically created by the framework.)

### CLI

The Igo.js CLI provides convenient functions to deal with the database migrations.

```sh
# run migrations
igo db migrate

# reset database (WARNING: data will be lost)
igo db reset
```

## Model Definition

### Basics

```js
const Model  = require('igo').Model;

const schema = {
  table:    'users',
  columns:  [
    'id',
    'email',
    'password',
    'first_name',
    'last_name',
    'created_at'
  ]
};

class User extends Model(schema) {
  //override constructor if needed
  constructor(values) {
    super(values);
  }

  name() {
    return this.first_name + ' ' + this.last_name;
  }
};

module.exports = User;
```

The `schema` object defines the table name and the table structure, and how this model can be associated to other models.


### Columns Types

Column types can be specified.

```js
const schema = {
  table:    'users',
  columns:  [
    'id',
    'first_name',
    'last_name',
    {name: 'is_validated', type: 'boolean'}
    {name: 'details_json', type: 'json', attr: 'details'},
    {name: 'pets_array', type: 'array', attr: 'pets'},
  ]
};
```
`boolean` will automatically be cast as boolean on instance.

`json` columns will automatically be stringified on creation and update and parsed on load (on the instance, the column key is set with the `attr` attribute).

`array` columns will automatically be stringified on creation and update and split on load (on the instance, the column key is set with the `attr` attribute).

### Associations

Add `associations` in the schema declaration.
Use `has_many` for one-to-many relationships, and `belongs_to` for many-to-one relationships.

```js
const Project = require('./Project');
const Country = require('./Country');
const schema  = {
  // ...
  columns: [
    'id',
    'country_id',
    // ...
  ]
  associations: [
    // [ type, attribute name, association model, model key, foreign key ('id' if not specified)]
    [ 'has_many',   'projects', Project, 'id', 'user_id'],
    [ 'belongs_to', 'country',  Country, 'country_id' ],
  ]
};
```

`has_many` can also be used with an array of references.
In the following example, projects_ids should be an array of projects' ids.

```js
const schema  = {
  // ...
  columns: [
    'id',
    {name: 'projects_ids_json', type: 'json', attr: 'projects_ids'}
    // ...
  ]
  associations: () => ([
    [ 'has_many',   'projects', require('./Project'), 'projects_ids', 'id'],
  ])
};
```

### Scopes

Scopes can be used to specify extra queries options.
Scopes are added to the schema declaration.

```js
const schema  = {
  // ...
  scopes: {
    default:    function(query) { query.order('`created_at` DESC'); },
    validated:  function(query) { query.where({ validated: true }); }
  }
};
```

The `default` scope will be used on all queries.
(Use `.unscoped()` to not use the default scope.)

```js
//Scopes usage
User.scope('validated').list(function(err, validatedUsers) {
  //..
});
```

## Model API

### Create

```js
// create default user
const user = await User.create();
// => User { id: null, first_name: null, last_name: null, ... }

// create with specified attributes
const user = await User.create({
  first_name: 'John',
  last_name:  'Doe',
});
// => User { id: null, first_name: 'John', last_name: 'Doe', ... }
```

If the primary key is an `AUTO_INCREMENT` field, it will be set automatically in the object returned in the callback.

### Find

```js
const user = await User.find(id);
console.log('Hi ' + user.first_name);
```

### Update

To update a specific object:

```js
const user = await User.find(id);
user.update({ first_name: 'Jim' });
console.log('Hi ' + user.first_name);
```

To update several objects:

```js
const users = await User.where({ country: 'France' })
users.update({ language: 'French' });
// Users are updated
```

To update all objects:

```js
User.update({ first_name: 'Jim' })
// all users are now named Jim

```

### Delete

To delete a specific object:

```js
User.destroy(id);
// user was deleted
```

```js
const user = await User.find(id);
user.destroy();
// user was deleted

```

```js
User.destroyAll();
// all users were deleted

```

```js
const users = await User.where({ first_name: 'Jim' });
users.destroy();
// all users named Jim were deleted

```

### List

```js
const users =  await User.list();
// users is an array of User objects

```

#### Where

Examples:
```js

// filter with attribute values
const users = await User.where({type: 'foo', sub_type: 'bar'}).list();

// filter with sql
const users = await User.where('`last_name` IS NOT NULL').list();

// filter with sql and params
const users = await User.where('`created_at` BETWEEN ? AND ?', [date1, date2]).list();
```

#### Limit

```js
const users = await User.limit(10).list();
// first ten users
console.dir(users);
```

#### Order

```js
const users = await User.order('`last_name` DESC').list();
console.dir(users);
```

### Associations loading

The `includes()` function is used to eager load the objects' associations

```js
// include one association
User.includes('country').first( ... );

// include multiple associations
User.includes(['country', 'projects']).first( ... );

// include nested associations (load projects's lead and tasks for each user)
User.includes({projects: ['lead', 'tasks']}).first( ... );

// mixed associations
User.includes(['country', {projects: ['lead', 'tasks']}]).first( ... );
```

### Count

`count()` allows you to count rows.

```js
const count = await User.count();
// count all users
console.dir(count);


const count = await User.where({first_name: 'john'}).count();
// count all users named John
console.dir(count);
```

### Distinct

```js
const first_names = await User.distinct('first_name').list();
// list all distinct user first names
console.dir(first_names);

const first_names = await User.distinct([ 'first_name', 'last_name' ]).list();
// list all distinct user first and last names combinations
console.dir(first_names);
```

### Select

`select()` allows you to customize `SELECT` (set by default to `SELECT *`).

```js
const users = await User.select('id, first_name').list();
// select only id and first_name columns
console.dir(users);

const users = await User.select('*, YEAR(created_at) AS `year`').list();
// add year (from created_at column) in user
console.dir(users);
```

### Group

```js
const groups = await User.select('COUNT(*) AS `count`, YEAR(created_at) AS `year`').group('year').list();
// return users count by creation year
console.dir(groups);
```

### Pagin

```js
const users = await User.page(current_page, nb_limit_element).list();
// return pagin of users
console.dir(users);

// Output
{
  pagination: {
    page: 1,
    nb: 10,
    previous: null,
    next: null,
    nb_pages: 1,
    count: '1',
    links: [ [Object] ]
  },
  rows: [
    User {
      id: 1,
      first_name: "edouard"
      updated_at: 2021-07-07T07:33:31.457Z,
      created_at: 2021-07-07T07:33:31.457Z,
    }
  ]
}
```

### Join

`join()` allows you to join 2 tables with LEFT, INNER OR RIGHT JOIN.

| Parameter  | Type | Description | Required | Default |
| ------------- |-------------|-------------|-------------|-------------|
| Association name | string       |   Name of the association (the table to join need to be declared as association in Schema) | true||
| Columns     | string or array   | Columns joined from the association table | false ||
| Type     | string    | "left"\|"inner"\|"right| false| "left"|

```js
const user = await User.join('country', 'country_code', 'left').first();
console.dir(user.country_code);

// Can be use combine with select()
const user = await User.select('`user`.*, `country`.`code` AS `country_code`' ).join('country').first();
console.dir(user.country_code);
```