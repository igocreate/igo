

const _         = require('lodash');

//
const sanitize = module.exports.sanitize = (value, attr) => {
  const { type, item_type } = attr;

  if (value === null || value === undefined) {
    return attr.default || value;
  }

  if (type === 'array') {
    if (!value) {
      return attr.default || null;
    }
    value = _.castArray(value);
    if (item_type) {
      return _.map(value, item => sanitize(item, {type: item_type}));
    }
    return value;
  }

  if (typeof value !== 'string') {
    if (_.isArray(value)) {
      value = value[0];
      if (value === null || value === undefined) {
        return attr.default || null;
      }
      if (typeof value !== 'string') {
        return value;
      }
    } else {
      return value;
    }
  }

  // trim
  value = value.trim();

  // Numbers
  if (['int', 'float'].indexOf(type) > -1) {
    value = _.replace(value, / /g, '');
    if (type === 'float') {
      value = _.replace(value, /,/g, '.');
    }
  }

  //
  return value;

};