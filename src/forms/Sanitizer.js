

const _         = require('lodash');

//
module.exports.sanitize = (value, attr) => {
  const { type } = attr;

  if (value === null || value === undefined) {
    return value;
  }

  // Arrays
  if (_.isArray(value)) {
    if (type === 'array') {
      // return array as it is
      return value;
    }
    // take first value
    return module.exports.sanitize(value[0], attr);
  }

  if (typeof value !== 'string') {
    console.warn(`Sanitizer should only sanitize strings (${attr.name} is ${typeof value})`);
    return value;
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