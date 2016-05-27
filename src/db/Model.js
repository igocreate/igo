'use strict';

var _   = require('lodash');

var Query = require('./Query');

//
var Model = function(model, schema) {

  // init
  if (!schema.primary) {
    schema.primary = ['id'];
  } else if (!_.isArray(schema.primary)) {
    schema.primary = [ schema.primary ];
  }

  var primaryObject = function(instance) {
    return _.pick(instance, schema.primary);
  }

  var Instance = function(row) {
    var instance = new model();

    row && _.assign(instance, row);

    instance.init && instance.init();

    // update
    instance.update = function(values, callback) {
      var _this = this;
      _.assign(_this, values);
      new Query(Instance, schema).update(schema.table).values(values).where(primaryObject(instance)).execute(function(err, result) {
        callback(err, _this);
      });
    };

    // reload
    instance.reload = function(callback) {
      model.find(this.id, callback);
    };

    // destroy
    instance.destroy = function(callback) {
      new Query(Instance, schema).delete(schema.table).where(primaryObject(instance)).execute(callback);
    };

    return instance;
  };

  // build new instance
  model.build = function(args) {
    return new Instance(args);
  };

  // find by id
  model.find = function(id, callback) {
    new Query(Instance, schema).from(schema.table).find(id, callback);
  };

  // create
  model.create = function(values, options, callback) {
    if (_.isFunction(values)) {
      callback = values;
    }
    if (_.isFunction(options)) {
      callback = options;
    }
    _.defaultsDeep(values, new Instance());
    return new Query(Instance, schema).insert(schema.table).values(values).options(options).execute(function(err, result) {
      if (err) {
        return callback && callback(err, result);
      }
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

  // destroy
  model.destroy = function(id, callback) {
    return new Query(Instance, schema).delete(schema.table).where({ id: id }).execute(callback);
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
