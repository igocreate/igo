
# Igo Model API

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

This configuration is given to the [node.js driver for mysql](https://github.com/mysqljs/mysql) `mysql.createPool(config.mysql)` function, to initialize the connection pool.

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

### DB CLI

The Igo CLI provides convenient functions to deal with the database migrations.

```sh
# run migrations
igo db migrate

# reset database (WARNING: data will be lost)
igo db reset
```

## Model Definition

### Basics

```js
'use strict';

const Model  = require('igo').Model;

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

The `default` scope will be used on all queries.
(Use `.unscoped()` to not use the default scope.)

```js
//Scopes usage
User.scope('validated').list(function(err, validatedUsers) {
  //..
});
```

### Callbacks

Callbacks are special hooks functions called by Igo during the life cycle of an Igo Model.

| Callback | Triggered |
|----------|-----------|
| `beforeCreate(callback)` | before object creation |
| `beforeUpdate(values, callback)` | before object update (modified attributes are given in the `values` parameter) |
| `afterFind(callback)` | after object is returned from database |

Example:
```js
class User extends Model(schema) {

  // hash password before creation
  beforeCreate(callback) {
    this.password = PasswordUtils.hash(this.password);
    callback();
  }
```


## Model API

### Create

```js
// create default user
User.create(function(err, user) {
  //
});

// create with specified attributes
User.create({
  first_name: 'John',
  last_name:  'John',
}, function(err, user) {
  console.log('Hi ' + user.first_name);
});
```

If the primary key is an `AUTO_INCREMENT` field, it will be set automatically in the object returned in the callback.

### Find

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

### List

```js
User.list(id, function(err, users) {
  console.log('user was deleted.')
});
```

#### Where

Examples:
```js

// filter with attribute values
User.where({type: 'foo', sub_type: 'bar'}).list(function(err, users) { ... });

// filter with sql
User.where('`last_name` IS NOT NULL').list(function(err, users) { ... });

// filter with sql and params
User.where('`created_at` BETWEEN ? AND ?', [date1, date2]).list(function(err, users) { ... });
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

The `includes()` function is used to eager load the objects' associations

```js
// include one association
User.includes('country']).first( ... );

// include multiple associations
User.includes(['country', 'projects']).first( ... );

// include nested associations (load projects's lead and tasks for each user)
User.includes({projects: ['lead', 'tasks']}).first( ... );

// mixed associations
User.includes(['country', {projects: ['lead', 'tasks']}]).first( ... );
```
