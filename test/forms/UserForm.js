
const Form = require('../../src/forms/Form');

const schema = {
  attributes: [
    { name: 'email',    type: 'text' },
    { name: 'int',      type: 'int' },
    { name: 'float',    type: 'float' },
    { name: 'password', type: 'text' },
    { name: 'check',    type: 'boolean' },
    { name: 'date',     type: 'date', format: 'DD/MM/YYYY' },
    { name: 'array',    type: 'array' },
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


