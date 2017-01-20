'use strict';

const _ = require('lodash');

module.exports = class Schema {

  static verify(schema) {
    if (!schema.primary) {
      schema.primary = ['id'];
    } else if (!_.isArray(schema.primary)) {
      schema.primary = schema.primary.split(',');
    }
    return schema;
  }
}
