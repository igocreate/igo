
const utils   = require('../utils');


const types = {
  boolean: {
    set: (value) => !!value,
    get: (value) => !!value,
  },
  json: {
    set: (value) => utils.toJSON(value),
    get: (value) => utils.fromJSON(value),
  },
  array: {
    set: (value) => value && Array.isArray(value) ? value.join(',') : value,
    get: (value) => value && value.split ? value.split(',') : []
  },
}

//
module.exports = {
  set: (type, value) => types[type] ? types[type].set(value) : value,
  get: (type, value) => types[type] ? types[type].get(value) : value,
};
