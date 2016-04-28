
'use strict';

var async   = require('async');
var _       = require('lodash');
var winston = require('winston');

var Sql     = require('./Sql');
var db      = require('./db');


var Query = function(Instance, schema) {

  this.query = {
    verb: 'select',
    where: [],
    order: [],
    includes: []
  };

  // INSERT
  this.insert = function(table) {
    this.query.verb   = 'insert';
    this.query.table  = table;
    return this;
  };

  // UPDATE
  this.update = function(table) {
    this.query.verb   = 'update';
    this.query.table  = table;
    return this;
  };

  // DELETE
  this.delete = function(table) {
    this.query.verb   = 'delete';
    this.query.table  = table;
    return this;
  };

  // FROM
  this.from = function(table) {
    this.query.table = table;
    return this;
  };

  // WHERE
  this.where = function(where, params) {
    where = params ? [where, params] : where;
    this.query.where.push(where);
    return this;
  };

  // VALUES
  this.values = function(values) {
    values = _.pickBy(values, function(value) {
      // skip instance functions
      return typeof value !== 'function';
    });
    // limit to schema columns
    this.query.values = _.pick(values, schema.columns);
    return this;
  };

  // FIRST
  this.first = function(callback) {
    this.query.limit = 1;
    this.execute(callback);
    return this;
  };

  // list
  this.list = function(callback) {
    this.execute(callback);
    return this;
  };

  // includes
  this.includes = function(includes) {
    var _this = this;
    var pushInclude = function(include) {
      var association = _.find(schema.associations, function(association) {
        return association[1] === include;
      });
      if (!association) {
        throw new Error('Missing association \'' + include + '\' on \'' + schema.table + '\' schema.');
      }
      _this.query.includes.push(association);
    };
    _.forEach(_.concat([], includes), pushInclude);
    return this;
  };

  // find
  this.find = function(id, callback) {
    if (!id) {
      return callback();
    } else if (_.isString(id) || _.isNumber(id)) {
      this.where({ id: id }).first(callback);
    } else if (_.isArray(id)) {
      this.where({ id: id }).list(callback);
    } else {
      return callback();
    }
  };

  // order
  this.order = function(order) {
    this.query.order.push(order);
    return this;
  };

  // generate SQL
  this.toSQL = function() {
    var params = [];
    var sql = new Sql(this.query)[this.query.verb + 'SQL']();
    // console.log(sql);
    return sql;
  };

  //
  this.execute = function(callback) {
    var _this = this;

    var query = _this.toSQL();
    // console.dir(query);

    db.query(query.sql, query.params, function(err, rows) {
      if (err) {
        console.log(err);
        winston.error(err);
        return callback(err);
      }

      async.eachSeries(_this.query.includes, function(includes, callback) {
        var type        = includes[0];
        var attr        = includes[1];
        var Obj         = includes[2];
        var column      = includes[3] || attr + '_id';
        var ref_column  = includes[4] || 'id';
        var ids         = _.chain(rows).map(column).uniq().value();
        if (ids.length === 0) {
          return callback();
        }
        var where = {};
        where[ref_column] = ids;
        Obj.where(where).list(function(err, objs) {
          var objsByKey = {};
          _.forEach(objs, function(obj) {
            var key = obj[ref_column];
            if (type === 'has_many') {
              objsByKey[key] = objsByKey[key] || [];
              objsByKey[key].push(obj);
            } else {
              objsByKey[key] = obj;
            }
          });
          var defaultValue = (type === 'has_many' ? [] : null);
          rows.forEach(function(row) {
            row[attr] = objsByKey[row[column]] || defaultValue;
          });
          callback();
        });

      }, function() {
        //
        if (rows && rows.length && _this.query.limit === 1) {
          rows = new Instance(rows[0]);
        } else if (_this.query.limit === 1) {
          rows = null;
        } else if (_this.query.verb === 'select') {
          rows = rows.map(function(row) {
            return new Instance(row);
          });
        }
        callback(err, rows);
      });
    });
  };
};

module.exports = Query;
