'use strict';

var _   = require('lodash');

var Sql = require('./Sql');

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
      new Sql(Instance).update(schema.table).values(values).where({ id: instance.id }).execute(function(err, result) {
        callback(err, _this);
      });
    };

    // reload
    instance.reload = function(callback) {
      model.find(this.id, callback);
    };

    // destroy
    instance.destroy = function(callback) {
      new Sql(Instance).delete(schema.table).where({ id: instance.id }).execute(callback);
    };

    return instance;
  };

  // find by id
  model.find = function(where, callback) {
    if (_.isString(where) || _.isNumber(where)) {
      where = { id: where };
    }
    new Sql(Instance).from(schema.table).where(where).first(callback);
  };

  // create
  model.create = function(values, callback) {
    if (_.isFunction(values)) {
      callback = values;
    }
    _.defaultsDeep(values, new Instance());
    new Sql(Instance).insert(schema.table).values(values).execute(function(err, result) {
      model.find(result && result.insertId, callback);
    });
  };

  // return all
  model.all = function(callback) {
    new Sql(Instance).from(schema.table).list(callback);
  };

  // filter
  model.where = function(where, params) {
    return new Sql(Instance).from(schema.table).where(where, params);
  }

  // destroy all
  model.destroyAll = function(callback) {
    return new Sql(Instance).delete(schema.table).execute(callback);
  }

  // includes
  model.includes = function(includes) {
    var association = _.find(schema.associations, function(association) {
      return association[0] === includes;
    });
    if (!association) {
      throw new Error('Missing association \'' + includes + '\' on \'' + schema.table + '\' schema.');
    }
    return new Sql(Instance).from(schema.table).includes(association);
  }

  return model;
};

module.exports = Model;
