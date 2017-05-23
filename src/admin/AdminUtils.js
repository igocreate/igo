

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
  } else if (field.match(/_date$/)) {
    return 'date';
  } else if (field.match(/_time$/)) {
    return 'time';
  } else if (field.match(/^(is|has)_/)) {
      return 'checkbox';
  } else if (field === 'description') {
      return 'textarea';
  }

  return 'text';
};

// formtype
module.exports.defaultFields = function(fields) {
  return fields.map(function(field) {
    if (_.isArray(field)) {
      return field;
    }
    return [ field, suggestFieldType(field) ];
  });
};


module.exports.handleParams = function(fields, body) {
  if (fields.schema) {
    //fields is a model
    fields = module.exports.defaultFields(fields.schema.columns);
  }
  
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
