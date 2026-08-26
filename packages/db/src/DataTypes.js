
const _            = require('lodash');
const dependencies = require('./dependencies');


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
    set:  value => dependencies.utils.toJSON(value),
    get:  value => dependencies.utils.fromJSON(value),
  },
  array: {
    set:  value => value && Array.isArray(value) ? value.join(',') : value,
    get:  value => value && value.split ? value.split(',') : []
  },
};
