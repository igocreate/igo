
'use strict';

var _ = require('lodash');

const SENSITIVE_FIELDS = [ 'password' ];


// deep filter response object, removing sensitive fields and functions
var filterObject = function(data) {
  if (_.isArray(data)) {
    // filter every array element
    data = _.map(data, filterObject);
  } else if (_.isObject(data) && _.keys(data).length > 0) {
    // filter object
    data = _.omit(data,   SENSITIVE_FIELDS);
    data = _.omitBy(data, _.isFunction);
    _.forEach(data, function(value, key) {
      data[key] = filterObject(value);
    });
  }
  return data;
};

//
module.exports = function(req, res, next) {

  res._send = res.send;

  res.send = function(data) {
    res._send(filterObject(data))
  };

  next();

};
