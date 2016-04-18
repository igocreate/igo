'use strict';

var _   = require('lodash');

var Query = require('./Query');

//
var Model = function(model, schema) {

  var Instance = function(row) {
    var instance = new model();

    row && _.assign(instance, row);

    instance.init && instance.init();

    // update
    instance.update = function(values, callback) {
      var _this = this;
      _.assign(_this, values);
      new Query(Instance, schema).update(schema.table).values(values).where({ id: instance.id }).execute(function(err, result) {
        callback(err, _this);
      });
    };

    // reload
    instance.reload = function(callback) {
      model.find(this.id, callback);
    };

    // destroy
    instance.destroy = function(callback) {
      new Query(Instance, schema).delete(schema.table).where({ id: instance.id }).execute(callback);
    };

    return instance;
  };

  // build new instance
  model.build = function(args) {
    return new Instance(args);
  };

  // find by id
  model.find = function(where, callback) {
    new Query(Instance, schema).from(schema.table).find(where, callback);
  };

  // create
  model.create = function(values, callback) {
    if (_.isFunction(values)) {
      callback = values;
    }
    _.defaultsDeep(values, new Instance());
    new Query(Instance, schema).insert(schema.table).values(values).execute(function(err, result) {
      model.find(result && result.insertId, callback);
    });
  };

  // return all
  model.all = function(callback) {
    new Query(Instance, schema).from(schema.table).list(callback);
  };

  // filter
  model.where = function(where, params) {
    return new Query(Instance, schema).from(schema.table).where(where, params);
  }

  // filter
  model.order = function(order) {
    return new Query(Instance, schema).from(schema.table).order(order);
  }

  // destroy all
  model.destroyAll = function(callback) {
    return new Query(Instance, schema).delete(schema.table).execute(callback);
  }

  // includes
  model.includes = function(includes) {
    return new Query(Instance, schema).from(schema.table).includes(includes);
  }

  return model;
};

module.exports = Model;
