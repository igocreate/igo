'use strict';

var _   = require('lodash');

var Sql = require('./Sql');

//
var Model = function(obj, schema) {

  var object = function(row) {
    var newObj = new obj();
    return _.assign(newObj, row);
  };

  // find by id
  obj.find = function(id, callback) {
    new Sql().from(schema.table).where({ id: id }).first(function(err, row) {
      if (row) {
        callback(err, object(row));
      } else {
        callback(err);
      }
    });
  };

  obj.create = function(values, callback) {
    new Sql().insert(schema.table).values(values).execute(function(err, result) {
      obj.find(result.insertId, callback);
    });
  };

  return obj;
};

module.exports = Model;
