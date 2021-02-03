require('../../src/dev/test/init');

const assert    = require('assert');
const _         = require('lodash');

const validator = require('../../src/connect/validator');
const UserForm  = require('./UserForm');
const ArrayForm = require('./ArrayForm');

//
describe('igo.Form', function() {

  let req = {};
  const res = { locals: {} };
  validator(req, res, () => {});

  it('should validate form', function(done) {
    req.body = {
      email: 'noooo@nooo.fr',
      int: '1 234',
      float: '1234,56',
      date: '24/12/2000'
    };
    const form = new UserForm().submit(req);
    assert.strictEqual(form.errors, null);
    assert(_.isDate(form.date));
    done();
  });

  it('should validate with array', function(done) {
    req.body = {
      array: 'elem',
      array2: ['elem', 'second_elem'],
      array_int: ['2', '1 234'],
      array_default: '',
      array_null: null,
    };
    const form = new ArrayForm().submit(req);
    assert.strictEqual(form.errors, null);
    assert.strictEqual(form.array.length, 1);
    assert.strictEqual(form.array2.length, 2);
    assert.strictEqual(form.array_int[1], 1234);
    assert.strictEqual(form.array_default.length, 0);
    assert.strictEqual(form.array_null, null);
    done();
  });

  it('should not validate form with errors', function(done) {
    req.body = {
      email: 'noooo'
    };
    const form = new UserForm().submit(req);
    assert.strictEqual(_.keys(form.errors).length, 4);
    done();
  });

});
