
'use strict';

var async   = require('async');
var _       = require('lodash');
var winston = require('winston');

var Sql     = require('./Sql');
var db      = require('./db');


var Query = function(modelClass) {

  var schema = modelClass.schema;

  this.query = {
    table:    schema.table,
    verb:     'select',
    where:    [],
    order:    [],
    includes: {},
    options:  {},
    scopes:   [ 'default' ]
  };

  // INSERT
  this.insert = function(table) {
    this.query.verb   = 'insert';
    if (table) {
      this.query.table  = table;
    }
    return this;
  };

  // UPDATE
  this.update = function(table) {
    this.query.verb   = 'update';
    this.query.table  = table;
    return this;
  };

  // DELETE
  this.delete = this.destroy = function(table) {
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
    var _this = this;
    this.query.limit = 1;
    schema.primary.forEach(function(key) {
      _this.query.order.push('`' + key + '`');
    });
    this.execute(callback);
    return this;
  };

  // LAST
  this.last = function(callback) {
    var _this = this;
    this.query.limit = 1;
    schema.primary.forEach(function(key) {
      _this.query.order.push('`' + key + '` DESC');
    });
    this.execute(callback);
    return this;
  };

  // LIMIT
  this.limit = function(offset, limit) {
    if (limit === undefined) {
      limit   = offset;
      offset  = 0;
    }
    this.query.offset = 0;
    this.query.limit  = limit;
    return this;
  };

  // SCOPE
  this.scope = function(scope) {
    this.query.scopes.push(scope);
    return this;
  };

  // UNSCOPED
  this.unscoped = function() {
    this.query.scopes.length = 0;
    return this;
  };

  // LIST
  this.list = function(callback) {
    this.execute(callback);
    return this;
  };

  // COUNT
  this.count = function(callback) {
    this.query.verb   = 'count';
    this.query.limit  = 1;
    this.execute(function(err, row) {
      callback(err, row && row.count);
    });
    return this;
  };

  // SCOPES
  this.applyScopes = function() {
    var _this = this;
    this.query.scopes.forEach(function(scope) {
      if (schema.scopes[scope]) {
        schema.scopes[scope](_this);
      }
    });
  };

  // INCLUDES
  this.includes = function(includes) {
    var _this = this;
    var pushInclude = function(include) {
      if (_.isString(include)) {
        _this.query.includes[include] = [];
      } else if (_.isObject(include)) {
        _.merge(_this.query.includes, include);
      }
    };
    _.forEach(_.concat([], includes), pushInclude);
    return this;
  };

  // FIND
  this.find = function(id, callback) {
    if (id && (_.isString(id) || _.isNumber(id))) {
      this.where({ id: id }).first(callback);
    } else if (id && _.isArray(id)) {
      id = _.compact(id);
      if (id.length === 0) {
        return callback();
      }
      this.where({ id: id }).first(callback);
    } else {
      this.where(id).first(callback);
    }
  };

  // ORDER BY
  this.order = function(order) {
    this.query.order.push(order);
    return this;
  };

  // QUERY OPTIONS
  this.options = function(options) {
    _.merge(this.query.options, options);
    return this;
  };

  // generate SQL
  this.toSQL = function() {
    var params = [];
    var sql = new Sql(this.query)[this.query.verb + 'SQL']();
    // console.log(sql);
    this.query.generated = sql;
    return sql;
  };

  //
  this.execute = function(callback) {
    var _this = this;

    if (schema.scopes) _this.applyScopes();

    var sqlQuery = _this.toSQL();

    db.query(sqlQuery.sql, sqlQuery.params, _this.query.options, function(err, rows) {
      if (err) {
        // console.log(err);
        // winston.error(err);
        return callback && callback(err);
      }

      async.eachSeries(_.keys(_this.query.includes), function(include, callback) {
        var association = _.find(schema.associations, function(association) {
          return association[1] === include;
        });
        if (!association) {
          throw new Error('Missing association \'' + include + '\' on \'' + schema.table + '\' schema.');
        }

        var type        = association[0];
        var attr        = association[1];
        var Obj         = association[2];
        var column      = association[3] || attr + '_id';
        var ref_column  = association[4] || 'id';
        var extraWhere  = association[5];

        var ids         = _.chain(rows).map(column).uniq().compact().value();
        if (ids.length === 0) {
          return callback();
        }
        var where = {};
        where[ref_column] = ids;
        var subincludes = _this.query.includes[include];
        var query = Obj.includes(subincludes).where(where);
        if (extraWhere) {
          query.where(extraWhere);
        }
        query.list(function(err, objs) {
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
        if (rows && rows.length > 0 && _this.query.limit === 1) {
          var obj = new modelClass(rows[0]);
          obj.afterFind(function() {
            callback(null, obj);
          });
        } else if (_this.query.limit === 1) {
          callback && callback(err, null);
        } else if (_this.query.verb === 'select') {
          async.mapSeries(rows, function(row, callback) {
            var obj = new modelClass(row);
            obj.afterFind(function() {
              callback(null, obj);
            });
          }, callback);
        } else {
          callback && callback(err, rows);
        }
      });
    });
  };
};

module.exports = Query;
