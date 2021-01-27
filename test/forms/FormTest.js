

require('../../src/dev/test/init');


const assert    = require('assert');
const _         = require('lodash');

const validator = require('../../src/connect/validator');
const UserForm  = require('./UserForm');

//
describe('igo.Form', function() {

  const req = {};
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

  it('should not validate form with errors', function(done) {
    req.body = {
      email: 'noooo'
    };
    const form = new UserForm().submit(req);
    assert.strictEqual(_.keys(form.errors).length, 4);
    done();
  });

});
