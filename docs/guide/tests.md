

# Testing Igo Applications

Testing your application is super important. Igo helps to write efficient tests easily.

Igo uses [Mocha](https://mochajs.org/) test framework, and offers more features:
- Testing controllers layer with [superagent](https://github.com/visionmedia/superagent)
- Automatic test database reinitialization before first test
- Test isolation: each test runs in a transaction that is rollbacked


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

describe('utils/DateUtils', () => {
  describe('startOfDay', () => {
    it('should return start of day', async () => {
      var d     = new Date();
      var start = DateUtils.startOfDay(d);
      assert.strictEqual(start.getHours(), 0);
      assert.strictEqual(start.getMinutes(), 0);
      assert.strictEqual(start.getSeconds(), 0);
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

describe('controllers/IndexController', () => {
  describe('/', () => {
    // redirection test
    it('should redirect to /foo', async () => {
      const res = await agent.get('/');
      assert.strictEqual(res.statusCode, 302);
      assert.strictEqual(res.redirectUrl, '/foo');
    });
  });
});
```
### Test body in HTML response

The HTML response is set in `res.body`.

```js
//...
it('should show form', async () => {
  const res = await agent.get('/foo');
  assert.strictEqual(res.statusCode, 200);
  assert(res.body.match(/<form /));
  done();
});
//...
```

### Test JSON response

The JSON response is set in `res.data`.

```js
//...
it('should return user and login', async () => {
  const user = await User.create({login: 'John'});
  var req = {
    body: {
      login: user.login,
    }
  };
  const res = await agent.post('/api/login', req);
  assert(res.data.id);
  assert.strictEqual(res.data.login, user.login);
  done();
});
//...
```