
const _         = require('lodash');
const Sanitizer = require('./Sanitizer');
const Converter = require('./Converter');


module.exports = function(schema) {

  class Form {


    submit(req, scope='body') {

      // save submitted values
      this._src = _.clone(req[scope]);

      // 1 : sanitize
      this.sanitize(req, scope);

      // 2 : validate
      this.validate && this.validate(req);

      // 3 : save errors and revert
      this.errors = req.getValidationErrors();
      if (this.errors) {
        this.revert();
        return this;
      }

      // 4 : convert
      this.convert(req, scope);

      // console.dir(this);
      return this;
    }

    // sanitize form values
    sanitize(req, scope='body') {
      _.each(schema.attributes, attr => {
        const value = Sanitizer.sanitize(req[scope][attr.name], attr);
        req[scope][attr.name] = value;
      });
    }

    // revert to values in req scope
    revert() {
      _.each(schema.attributes, attr => {
        this[attr.name] = this._src[attr.name];
      });
    }

    // convert form values
    convert(req, scope='body') {
      _.each(schema.attributes, attr => {
        this[attr.name] = Converter.convert(req[scope][attr.name], attr);
        if (this[attr.name] === null && attr.default !== undefined) {
          this[attr.name] = attr.default;
        }
      });
    }

    getValues() {
      return _.pick(this, _.map(schema.attributes, 'name'));
    }

  }

  Form.schema = schema;

  return Form;
};


