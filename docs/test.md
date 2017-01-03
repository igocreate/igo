
# Testing Igo Applications

Testing your application is super important. Igo helps to write efficient tests easily.

Igo uses Mocha for running the tests and superagent for testing the controller layer.

## Introduction

All tests run in the `test` environment, which allows you to define specific configuration for your tests.

All the tests must include this Igo Test init instruction:
```js
require('igo').dev.test();
```

This function will initialize the Mocha test suite, and do the following:
- reinitialize the 'test' database : drop, create, and execute all the `/sql/*.sql` files
- Flush the cache (Redis)
- __Begin__ a DB transaction before each test
- __Rollback__ the DB transaction after each test


## How to write a test

Here is a basic test example

```js

require('igo').dev.test();

var assert    = require('assert');
var DateUtils = require('../../app/utils/DateUtils');

describe('utils/DateUtils', function() {
  describe('startOfDay', function() {
    it('should return start of day', function() {
      var d     = new Date();
      var start = DateUtils.startOfDay(d);
      assert.equal(start.getHours(), 0);
      assert.equal(start.getMinutes(), 0);
      assert.equal(start.getSeconds(), 0);
    });
  });
});

```

## Testing the Controller Layer

Here are some basic tests for controllers.

### Test redirection
```js
require('igo').dev.test();

var assert = require('assert');
var agent = require('igo').dev.agent;

describe('controllers/IndexController', function() {
  describe('/', function() {
    // redirection test
    it('should redirect to /foo', function(done) {
      agent.get('/', function(err, res) {
        assert.equal(res.statusCode, 302);
        assert.equal(res.redirectUrl, '/foo');
        done();
      });
    });
  });
});
```
### Test body in HTML response

The HTML response is set in `res.body`.

```js
//...
it('should show form', function(done) {
  agent.get('/foo', function(err, res) {
    assert.equal(res.statusCode, 200);
    assert(res.body.match(/<form /));
    done();
  });
});
//...
```

### Test JSON response

The JSON response is set in `res.data`.

```js
//...
it('should return user and login', function(done) {
  User.create({login: 'John'}, function(err, user) {
    var req = {
      body: {
        login: user.login,
      }
    };
    agent.post('/api/login', req, function(err, res) {
      assert(res.data.id);
      assert(res.data.login === 'V');
      assert.equal(res.locals.session.current_user.id, user.id);
      done();
    });
  });
//...
```
