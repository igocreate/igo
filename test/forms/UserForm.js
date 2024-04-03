
const Form = require('../../src/forms/Form');

const schema = {
  attributes: [
    { name: 'email',    type: 'text' },
    { name: 'name',     type: 'text' },
    { name: 'int',      type: 'int' },
    { name: 'age',      type: 'int' },
    { name: 'float',    type: 'float' },
    { name: 'price',    type: 'float' },
    { name: 'password', type: 'text' },
    { name: 'check',    type: 'boolean' },
    { name: 'yesno',    type: 'boolean', allownull: true },
    { name: 'date',     type: 'date', format: 'DD/MM/YYYY' },
    { name: 'array',    type: 'array' },
    { name: 'lower',    type: 'custom', convert: v => v && v.toLowerCase() }
  ]
};

class UserForm extends Form(schema) {

  //
  validate(req) {
    req.checkBody('email', 'error.email').isEmail();
    req.checkBody('int', 'error.int').isInt();
    req.checkBody('float', 'error.float').isFloat();
    req.checkBody('date', 'error.date').isDate('DD/MM/YYYY');
  }

}

module.exports = UserForm;


