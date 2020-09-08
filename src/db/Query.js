
const _         = require('lodash');
const async     = require('async');

const Sql       = require('./Sql');
const db        = require('./db');

const DataTypes = require('./DataTypes');


module.exports = class Query {

  constructor(modelClass, verb = 'select') {
    this.modelClass = modelClass;
    this.schema     = modelClass.schema;
    this.query      = {
      table:    modelClass.schema.table,
      select:   null,
      verb:     verb,
      where:    [],
      order:    [],
      distinct: null,
      group:    null,
      includes: {},
      options:  {},
      scopes:   [ 'default' ]
    };
    // filter on subclass
    const key = _.findKey(this.schema.subclasses, { name: this.modelClass.name })
    if (key) {
      this.query.where.push({
        [this.schema.subclass_column]: key
      });
    }
  }

  // UPDATE
  update(values, callback) {
    this.query.verb = 'update';
    this.values(values).execute(callback);
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
    where = params !== undefined ? [where, params] : where;
    this.query.where.push(where);
    return this;
  }

  // VALUES
  values(values) {
    this.query.values = _.transform(values, (result, value, key) => {
      const column = this.schema.colsByAttr[key];
      if (column) {
        result[column.name] = DataTypes[column.type].set(value);
      }
    }, {});
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

  // PAGE
  page(page, nb) {
    this.query.page   = parseInt(page, 10) || 1;
    this.query.page   = Math.max(1, this.query.page);
    this.query.nb     = parseInt(nb, 10) || 25;
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

  // SELECT
  select(select) {
    this.query.select = select;
    return this;
  }

  // COUNT
  count(callback) {
    const countQuery = _.cloneDeep(this);
    countQuery.query.verb   = 'count';
    countQuery.query.limit  = 1;
    delete countQuery.query.page;
    delete countQuery.query.nb;
    countQuery.execute(function(err, row) {
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

  // DISTINCT
  distinct(columns) {
    this.query.distinct = _.isArray(columns) ? columns : [ columns ];
    return this;
  }

  // GROUP
  group(columns) {
    this.query.group = _.castArray(columns);
    return this;
  }

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
  paginate(callback) {
    if (!this.query.page) {
      return callback();
    }
    this.count((err, count) => {
      const nb_pages  = Math.ceil(count / this.query.nb);
      this.query.page = Math.min(this.query.page, nb_pages);
      this.query.page = Math.max(this.query.page, 1);
      this.query.offset = (this.query.page - 1) * this.query.nb;
      this.query.limit  = this.query.nb;

      const links = [];
      const page  = this.query.page;
      const start = Math.max(1, page - 5);
      for (let i = 0; i < 10; i++) {
        const p = start + i;
        if (p <= nb_pages) {
          links.push({ page: p, current: page === p });
        }
      }
      callback(err, {
        page:     this.query.page,
        nb:       this.query.nb,
        previous: page > 1 ? page - 1 : null,
        next:     page < nb_pages ? page + 1 : null,
        nb_pages,
        count,
        links,
      });
    });
  }

  //
  loadAssociation(include, rows, callback) {
    const association = _.find(this.schema.associations, function(association) {
      return association[1] === include;
    });
    if (!association) {
      throw new Error('Missing association \'' + include + '\' on \'' + this.schema.table + '\' schema.');
    }

    const type        = association[0];
    const attr        = association[1];
    const Obj         = association[2];
    const column      = association[3] || attr + '_id';
    const ref_column  = association[4] || 'id';
    const extraWhere  = association[5];
    
    const ids           = _.chain(rows).flatMap(column).uniq().compact().value();
    const defaultValue  = (type === 'has_many' ? [] : null);

    if (ids.length === 0) {
      rows.forEach(row => row[attr] = defaultValue);
      return callback();
    }
    const where = {
      [ref_column]: ids
    };
    const subincludes = this.query.includes[include];
    const query = Obj.includes(subincludes).where(where);
    if (extraWhere) {
      query.where(extraWhere);
    }
    query.list((err, objs) => {
      const objsByKey = {};
      _.forEach(objs, (obj) => {
        const key = obj[ref_column];
        if (type === 'has_many') {
          objsByKey[key] = objsByKey[key] || [];
          objsByKey[key].push(obj);
        } else {
          objsByKey[key] = obj;
        }
      });

      rows.forEach((row) => {
        if (!Array.isArray(row[column])) {
          row[attr] = objsByKey[row[column]] || defaultValue;
          return ;
        }
        row[attr] = _.chain(row[column]).flatMap(id => objsByKey[id]).compact().value();
      });

      callback();
    });
  }


  //
  execute(callback) {
    const _this = this;

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


    _this.paginate(function(err, pagination) {

      const sqlQuery = _this.toSQL();
      db.query(sqlQuery.sql, sqlQuery.params, _this.query.options, function(err, rows) {
        if (err) {
          // console.log(err);
          return callback && callback(err);
        }
        if (!callback) {
          return;
        }
        if (_this.query.verb !== 'select') {
          return callback(err, rows);
        }

        if (_this.query.distinct || _this.query.group) {
          return callback(err, rows);
        } else if (_this.query.limit === 1 && (!rows || rows.length === 0 )) {
          return callback(err, null);
        } else if (_this.query.verb === 'select') {
          rows = _.each(rows, row => _this.schema.parseTypes(row));
        }

        async.eachSeries(_.keys(_this.query.includes), (include, callback) => {
          _this.loadAssociation(include, rows, callback);
        }, (err) => {
          if (_this.query.verb === 'select') {
            rows = _.map(rows, row => _this.newInstance(row));
          }

          //
          if (_this.query.limit === 1) {
            return callback(err, rows[0]);
          }

          if (pagination) {
            return callback(err, { pagination, rows })
          }
          callback(err, rows);
        });
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
