

const _         = require('lodash');
const moment    = require('moment');


// converters by type
const TYPE_CONVERTERS = {
  date: (v, attr) => {
    const m = moment(v, attr.format);
    if (!m.isValid()) {
      return null;
    }
    return m.toDate();
  },
  int:      v => parseInt(v, 10),
  float:    v => parseFloat(v),
  boolean:  v => !!v,
};


//
const convert = module.exports.convert = (value, attr) => {
  const { type, item_type } = attr;

  if (_.isArray(value)) {
    if (item_type) {
      return _.map(value, item => convert(item, {type: item_type}));
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
  }

  //
  return value;

};