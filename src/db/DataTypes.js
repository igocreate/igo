
const _       = require('lodash');
const utils   = require('../utils');


module.exports = {
  default: {
    set:  _.identity,
    get:  _.identity,
  },
  boolean: {
    set:  value => (value === null || value === undefined) ? null : !!value,
    get:  value => (value === null || value === undefined) ? null : !!value,
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
