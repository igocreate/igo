
const _         = require('lodash');
const Sanitizer = require('./Sanitizer');
const Converter = require('./Converter');


module.exports = function(schema) {

  class Form {


    submit(req, scope='body') {

      // save submitted values
      const submitted = _.clone(req[scope]);

      // 1 : sanitize
      this.sanitize(req, scope);

      // 2 : validate
      this.validate && this.validate(req);

      // 3 : save errors and unsanitize
      this.errors = req.getValidationErrors();
      if (this.errors) {
        this.unsanitize(submitted);
        return this
      }

      // 4 : convert
      this.convert(req, scope);

      // console.dir(this);
      return this;
    }

    // sanitize form values
    sanitize(req, scope) {
      _.each(schema.attributes, attr => {
        const value = Sanitizer.sanitize(req[scope][attr.name], attr);
        req[scope][attr.name] = value;
      });
    }

    // revert to values in req scope
    unsanitize(submitted) {
      _.each(schema.attributes, attr => {
        this[attr.name] = submitted[attr.name];
      });
    }

    // convert form values
    convert(req, scope) {
      _.each(schema.attributes, attr => {
        const value = Converter.convert(req[scope][attr.name], attr);
        this[attr.name] = value || attr.default || null;
      });
    }

  }

  Form.schema = schema;

  return Form;
};


