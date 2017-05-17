'use strict';

const _ = require('lodash');

module.exports = class Schema {

  static verify(schema) {
    if (!schema.primary) {
      schema.primary = ['id'];
    } else if (!_.isArray(schema.primary)) {
      schema.primary = schema.primary.split(',');
    }

    schema.subclass_column = schema.subclass_column || 'type';

    // allow async associations loading for circular dependencies
    // TODO: find another way
    process.nextTick(function() {
      if (_.isFunction(schema.associations)) {
        schema.associations = schema.associations();
      };
      if (_.isFunction(schema.subclasses)) {
        schema.subclasses = schema.subclasses();
      };
    });

    return schema;
  }
}
