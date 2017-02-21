'use strict';

const _ = require('lodash');

module.exports = class Schema {

  static verify(schema) {
    if (!schema.primary) {
      schema.primary = ['id'];
    } else if (!_.isArray(schema.primary)) {
      schema.primary = schema.primary.split(',');
    }

    // allow async associations loading for circular dependencies
    process.nextTick(function() {
      if (_.isFunction(schema.associations)) {
        schema.associations = schema.associations();
      };
    });

    return schema;
  }
}
