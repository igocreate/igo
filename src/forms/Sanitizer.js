

const _         = require('lodash');
const moment    = require('moment');

//
module.exports.sanitize = (value, attr) => {
  const { type } = attr;

  if (!value) {
    return value;
  }

  // Arrays
  if (_.isArray(value)) {
    if (type === 'array') {
      // return array as it is
      return value;
    }
    return module.exports.sanitize(value[0], attr);
  }

  if (typeof value !== 'string') {
    return value;
  }

  // trim
  value = value.trim();

  // Dates
  if (type === 'date') {
    const m = moment(value, attr.format);
    if (!m.isValid()) {
      return null;
    }
    value = m.toDate();
  }

  // Numbers
  if (['int', 'float'].indexOf(type) > -1) {
    value = _.replace(value, / /g, '');
    if (type === 'int') {
      value = parseInt(value, 10);
    } else if (type === 'float') {
      value = _.replace(value, /,/g, '.');
      value = _.parseFloat(value);
    }
    if (isNaN(value)) {
      return null;
    }
  }

  //
  return value;

};