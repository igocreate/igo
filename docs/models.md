
# Igo Models

The Igo Model API for MySQL is the only part of Igo that is not just the integration of another module.
As you will notice, the syntax was very inspired by [Ruby on Rails Active Record](http://guides.rubyonrails.org/active_record_basics.html).

## MySQL Configuration

This is the default MySQL configuration (`config.mysql`) defined by Igo:
```
config.mysql = {
  host     : process.env.MYSQL_HOST     || 'localhost',
  port     : process.env.MYSQL_PORT     || 3306,
  user     : process.env.MYSQL_USERNAME || 'root',
  password : process.env.MYSQL_PASSWORD || '',
  database : process.env.MYSQL_DATABASE || 'igo',
  debug    : false,     // mysql driver debug mode
  connectionLimit : 5,
  debugsql : false      // show sql logs
};
```

This configuration object is directly transmitted to the [node.js driver for mysql](https://github.com/mysqljs/mysql) `mysql.createPool(config.mysql)` function.

You can override this configuration in your `/app/config.js` file:
```js
if (config.env === 'dev') {
  // show sql logs
  config.mysql.debugsql = true;
}
```


## DB Migrations

All the SQL files should be placed in the `/sql` directory, and will be played in the alphabetical order.
The SQL files names must follow this pattern: `YYYYMMDD-*.sql`.

To run the migrations, use:
```js
require('igo').db.migrate();
```

When a migration file has run successfully, it is saved in a `__db_migrations` table so it will not run again next time. (This table is automatically created by the framework.)


## Model Definition

### Basics

```js
'use strict';

const Model     = require('igo').Model;

const schema = {
  table:    'users',
  columns:  [
    'id',
    'email',
    'password',
    'first_name',
    'last_name'
  ]
};

const User = function() {
  //
};

module.exports = new Model(User, schema);
```

The `schema` object defines the table name and the table structure, and how this model can be associated to other models.

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

The particular `default` scope will be used on all queries.
Use `.unscoped()` to not use the default scope.

## ORM API

### Create

```js
User.create({
  first_name: 'John',
  last_name:  'John',
}, function(err, user) {
  console.log('Hi ' + user.first_name);
});
```

If the primary key is an `AUTO_INCREMENT` field, it will be set automatically in the object returned in the callback.

### Read

```js
User.find(id, function(err, user) {
  console.log('Hi ' + user.first_name);
});
```

### Update

```js
User.find(id, function(err, user) {
  user.update({
    first_name: 'Jim'
  }, function(err, user) {
    console.log('Hi ' + user.first_name);
  });
});
```

### Delete

To delete a specific object:

```js
User.destroy(id, function(err) {
  // user was deleted
});
```

```js
User.find(id, function(err, user) {
  user.destroy(function(err) (
    // user was deleted
  ));
});
```

```js
User.destroyAll(function(err) {
  // All users were deleted
});
```

```js
User.where({first_name: 'Jim'}).destroy(function(err) {
  // All users named Jim were deleted
});
```

### Search

```js
User.list(id, function(err, users) {
  console.log('user was deleted.')
});
```

#### Where

```js
User.where('`created_at` BETWEEN ? AND ?', [date1, date2]).list(function(err, users) {
  console.dir(users);
});
```

#### Limit

```js
User.limit(10).list(function(err, users) {
  // first ten users
  console.dir(users);
});
```

#### Order

```js
User.order('`last_name` DESC').list(function(err, users) {
  console.dir(users);
});
```

### Associations loading

Use `includes` to eager load the objects' Associations

```js
User.includes(['country', 'projects']).first(function(err, user) {
  console.dir(user.country);
  console.dir(user.projects);
});
```
