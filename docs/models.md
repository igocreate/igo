
# Igo Models

The Igo Model API for MySQL is the only part of Igo that is not just the integration of another module.
As you will notice, the syntax was very inspired by [Ruby on Rails Active Record](http://guides.rubyonrails.org/active_record_basics.html).

## DB Migrations

All the SQL files should be placed in the `/sql` directory, and will be played in the alphabetical order.
They must be named with this pattern: `YYYYMMDD-*.sql`.

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
TODO

## ORM

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

### Search
