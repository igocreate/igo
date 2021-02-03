

const _     = require('lodash');
const Form  = require('../../src/forms/Form');

const schema = {
  attributes: [
    { name: 'array',          type: 'array' },
    { name: 'array2',         type: 'array' },
    { name: 'array_int',      type: 'array', item_type: 'int' },
    { name: 'array_default',  type: 'array', default: [] },
    { name: 'array_null',     type: 'array' },
  ]
};

class ArrayForm extends Form(schema) {

  //
  validate(req) {
    req.checkBody('array', 'error.array').custom(a => !_.isEmpty(a));
    req.checkBody('array2', 'error.array2').custom(a => !_.isEmpty(a));
  }

}

module.exports = ArrayForm;


