
const _       = require('lodash');
const utils   = require('../utils');


module.exports = {
  default: {
    set:  _.identity,
    get:  _.identity,
  },
  boolean: {
    set:  value => !!value,
    get:  value => !!value,
  },
  json: {
    set:  value => utils.toJSON(value),
    get:  value => utils.fromJSON(value),
  },
  array: {
    set:  value => value && Array.isArray(value) ? value.join(',') : value,
    get:  value => value && value.split ? value.split(',') : []
  },
};
