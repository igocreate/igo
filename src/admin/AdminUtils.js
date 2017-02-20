

'use strict';

const _             = require('lodash');

const STATIC_FIELDS = [ 'created_at', 'updated_at', 'deleted_at' ];

//
const suggestFieldType = function(field) {
  //
  if (field === 'id') {
    // TODO: handle other primary keys
    return 'hidden';
  } else if (STATIC_FIELDS.indexOf(field) > -1) {
    return 'static';
  } else if (field.match(/_at$/)) {
    return 'datetime';
  } else if (field.match(/^is_/)) {
      return 'checkbox';
  } else if (field === 'description') {
      return 'textarea';
  }

  return 'text';
};

// formtype
module.exports.defaultFields = function(fields, options) {
  return fields.map(function(field) {
    return [ field, suggestFieldType(field) ];
  });
};


module.exports.handleParams = function(fields, body) {
  _.forEach(fields, function(fieldInfo) {
    let field = fieldInfo[0];
    let type  = fieldInfo[1];

    // replace '' with null
    if (body[field] === '') {
      body[field] = null;
    }

    // checkboxes
    if (type === 'checkbox') {
      body[field] = body[field] ? 1 : 0;
    }
  });
}

//
module.exports.pluralize = function(name) {
  if (name.endsWith('y')) {
    return name.substring(0, name.length - 1) + 'ies';
  }
  if (name.endsWith('x')) {
    return name + 'es';
  }
  return name + 's';
};
