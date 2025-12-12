

const _         = require('lodash');
const moment    = require('moment');


// converters by type
const TYPE_CONVERTERS = {
  date: (v, attr) => {
    const m = moment(v, attr.format || 'YYYY-MM-DD');
    if (!m.isValid()) {
      return null;
    }
    return m.toDate();
  },
  int:      v => parseInt(v, 10),
  float:    v => parseFloat(v),
  number:   v => Number(v),
  boolean:  (v, attr) => {
    if (v === undefined || v === null) {
      return attr.allownull ? null : false;
    }
    return !!v;
  },
  text:     v => v || null,
  array:    v => v || null,
  custom:  (v, attr) => {
    if (attr.convert) {
      return attr.convert(v, attr);
    }
    return v || null;
  }
};


//
module.exports.convert = (value, attr) => {
  const { type, item_type, format } = attr;

  if (_.isArray(value)) {
    if (item_type) {
      return _.map(value, v => module.exports.convert(v, {type: item_type, format}));
    }
    return value;
  }

  if (value && typeof value !== 'string') {
    console.error(`Converter should only convert strings (${attr.name} is ${typeof value})`);
    return value;
  }

  // convert by type
  if (TYPE_CONVERTERS[type]) {
    value = TYPE_CONVERTERS[type](value, attr);
  } else {
    console.error(`Unknown type ${type} (attribute ${attr.name})`);
  }

  //
  if (!value && value !== 0 && value !== false) {
    value = null;
  }
  
  //
  return value;

};