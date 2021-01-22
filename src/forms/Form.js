
const _         = require('lodash');
const Sanitizer = require('./Sanitizer');


module.exports = function(schema) {

  class Form {


    submit(req, scope='body') {

      // 1 : sanitize
      this.sanitize(req, scope);

      // 2 : validate
      this.validate && this.validate(req);

      // 3 : save errors and unsanitize
      this.errors = req.getValidationErrors();
      if (this.errors) {
        this.unsanitize(req, scope);
      }

      // console.dir(this);
      return this;
    }

    // sanitize form values
    sanitize(req, scope='body') {
      _.each(schema.attributes, attr => {
        const value = Sanitizer.sanitize(req[scope][attr.name], attr);
        this[attr.name] = value || attr.default || null;
      });
    }

    // revert to values in req scope
    unsanitize(req, scope='body') {
      _.each(schema.attributes, attr => {
        this[attr.name] = req[scope][attr.name];
      });
    }

  }

  Form.schema = schema;

  return Form;
};


