
'use strict';

var async   = require('async');
var _       = require('lodash');
var winston = require('winston');

var Sql     = require('./Sql');
var db      = require('./db');


class  Query {

  constructor(modelClass, verb = 'select') {
    this.modelClass = modelClass;
    this.schema     = modelClass.schema;
    this.query      = {
      table:    modelClass.schema.table,
      verb:     verb,
      where:    [],
      order:    [],
      includes: {},
      options:  {},
      scopes:   [ 'default' ]
    };
  }

  // UPDATE
  update(values, callback) {
    this.query.verb   = 'update';
    // limit to schema columns
    this.query.values = _.pick(values, this.schema.columns);
    this.execute(callback);
    return this;
  }

  // DELETE
  delete(callback) {
    this.query.verb   = 'delete';
    this.execute(callback);
    return this;
  }
  destroy(callback) {
    return this.delete(callback);
  }

  // FROM
  from(table) {
    this.query.table = table;
    return this;
  };

  // WHERE
  where(where, params) {
    where = params ? [where, params] : where;
    this.query.where.push(where);
    return this;
  }

  // VALUES
  values(values) {
    values = _.pickBy(values, function(value) {
      // skip instance functions
      return typeof value !== 'function';
    });
    // limit to schema columns
    this.query.values = _.pick(values, this.schema.columns);
    return this;
  }

  // FIRST
  first(callback) {
    var _this = this;
    this.query.limit  = 1;
    this.query.take   = 'first';
    this.execute(callback);
    return this;
  }

  // LAST
  last(callback) {
    var _this = this;
    this.query.limit  = 1;
    this.query.take   = 'last';
    this.execute(callback);
    return this;
  }

  // LIMIT
  limit(offset, limit) {
    if (limit === undefined) {
      limit   = offset;
      offset  = 0;
    }
    this.query.offset = 0;
    this.query.limit  = limit;
    return this;
  };

  // SCOPE
  scope(scope) {
    this.query.scopes.push(scope);
    return this;
  }

  // UNSCOPED
  unscoped() {
    this.query.scopes.length = 0;
    return this;
  }

  // LIST
  list(callback) {
    this.execute(callback);
    return this;
  }

  // COUNT
  count(callback) {
    this.query.verb   = 'count';
    this.query.limit  = 1;
    this.execute(function(err, row) {
      callback(err, row && row.count);
    });
    return this;
  }

  // SCOPES
  applyScopes() {
    var _this = this;
    this.query.scopes.forEach(function(scope) {
      if (_this.schema.scopes[scope]) {
        _this.schema.scopes[scope](_this);
      }
    });
  }

  // INCLUDES
  includes(includes) {
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
  }

  // FIND
  find(id, callback) {
    if (id === null || id === undefined || id.length === 0) {
      return callback(null, null);
    } else if (_.isString(id) || _.isNumber(id)) {
      this.where({ id: id }).first(callback);
    } else if (_.isArray(id)) {
      id = _.compact(id);
      this.where({ id: id }).first(callback);
    } else {
      this.where(id).first(callback);
    }
  }

  // ORDER BY
  order(order) {
    this.query.order.push(order);
    return this;
  };

  // QUERY OPTIONS
  options(options) {
    _.merge(this.query.options, options);
    return this;
  }

  // generate SQL
  toSQL() {
    var params = [];
    var sql = new Sql(this.query)[this.query.verb + 'SQL']();
    // console.log(sql);
    this.query.generated = sql;
    return sql;
  }

  //
  execute(callback) {
    var _this = this;

    if (this.schema.scopes) {
      _this.applyScopes();
    }

    if (_this.query.order.length === 0 &&
        (_this.query.take === 'first' || _this.query.take === 'last')) {
      const order = _this.query.take === 'first' ? 'ASC' : 'DESC';
      // default sort by primary key
      this.schema.primary.forEach(function(key) {
        _this.query.order.push('`' + key + '` ' + order);
      });
    }

    var sqlQuery = _this.toSQL();

    db.query(sqlQuery.sql, sqlQuery.params, _this.query.options, function(err, rows) {
      if (err) {
        // console.log(err);
        // winston.error(err);
        return callback && callback(err);
      }

      async.eachSeries(_.keys(_this.query.includes), function(include, callback) {
        var association = _.find(_this.schema.associations, function(association) {
          return association[1] === include;
        });
        if (!association) {
          throw new Error('Missing association \'' + include + '\' on \'' + _this.schema.table + '\' schema.');
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

      }, function(err) {
        //
        if (rows && rows.length > 0 && _this.query.limit === 1) {
          var obj = _this.newInstance(rows[0]);
          callback && callback(err, obj);
        } else if (_this.query.limit === 1) {
          callback && callback(err, null);
        } else if (_this.query.verb === 'select') {
          const objs = _.map(rows, function(row, callback) {
            return _this.newInstance(row);
          });
          callback && callback(err, objs);
        } else {
          callback && callback(err, rows);
        }
      });
    });
  }

  newInstance(row) {
    let instanceClass = this.modelClass;
    const type        = row[this.schema.subclass_column];
    if (this.schema.subclasses && type) {
      instanceClass = this.schema.subclasses[type];
    }
    return new instanceClass(row)
  }
}

module.exports = Query;
