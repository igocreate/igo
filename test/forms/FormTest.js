require('../../src/dev/test/init');

const assert    = require('assert');
const _         = require('lodash');

const validator = require('../../src/connect/validator');
const UserForm  = require('./UserForm');
const ArrayForm = require('./ArrayForm');

//
describe('igo.Form', () => {

  
  const reqWithBody = (body) => {
    const req = {};
    const res = { locals: {} };
    validator(req, res, () => {});
    req.body = body;
    return req;
  };

  it('should validate form', () => {
    const body = {
      email: 'noooo@nooo.fr',
      int: '1 234',
      float: '1234,56',
      date: '24/12/2000'
    };
    const form = new UserForm().submit(reqWithBody(body));
    assert.strictEqual(form.errors, null);
    assert(_.isDate(form.date));
    assert.strictEqual(form.int, 1234);
    assert.strictEqual(form.age, null);
    assert.strictEqual(form.float, 1234.56);
    assert.strictEqual(form.price, null);
  });

  it('should validate with array', () => {
    const body = {
      array: 'elem',
      array2: ['elem', 'second_elem'],
      array_int: ['2', '1 234'],
      array_default: '',
      array_null: null,
    };
    const form = new ArrayForm().submit(reqWithBody(body));
    assert.strictEqual(form.errors, null);
    assert.strictEqual(form.array.length, 1);
    assert.strictEqual(form.array2.length, 2);
    assert.strictEqual(form.array_int[1], 1234);
    assert.strictEqual(form.array_default.length, 0);
    assert.strictEqual(form.array_null, null);
  });

  it('should not validate form with errors', () => {
    const body = {
      email: 'noooo'
    };
    const form = new UserForm().submit(reqWithBody(body));
    assert.strictEqual(_.keys(form.errors).length, 4);
  });

  it('should handle zeros as a value', () => {
    const body = {
      email: 'noooo@gmail.com',
      name: '',
      int:    '0',
      age:    'abc',
      float: '1234,56',
      date: '24/12/2000',
      price: '0.0'
    };
    const form = new UserForm().submit(reqWithBody(body));
    assert.strictEqual(_.keys(form.errors).length, 0);
    assert.strictEqual(form.name, null);
    assert.strictEqual(form.int, 0);
    assert.strictEqual(form.age, null);
    assert.strictEqual(form.float, 1234.56);
    assert.strictEqual(form.price, 0);
  });

});
