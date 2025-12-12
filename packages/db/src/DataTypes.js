
const _       = require('lodash');
const context = require('./context');


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
    set:  value => context.utils.toJSON(value),
    get:  value => context.utils.fromJSON(value),
  },
  array: {
    set:  value => value && Array.isArray(value) ? value.join(',') : value,
    get:  value => value && value.split ? value.split(',') : []
  },
};
