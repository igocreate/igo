
const _         = require('lodash');
const async     = require('async');

const Sql       = require('./Sql');
const dbs       = require('./dbs');

const DataTypes = require('./DataTypes');

//
const merge = (includes, includeParam) => {
  // console.dir({MERGE: { includes, includeParam}}, { depth: 99 });
  if (_.isString(includeParam)) {
    if (!includes[includeParam]) {
      includes[includeParam] = {};
    }
    return;
  }

  _.each(includeParam, (value, key) => {
    if (includes[key]) {
      if (_.isString(includes[key])) {
        includes[key] = {};
      }
      merge(includes[key], value);
    } else {
      includes[key] = value;
    }
  });
  // console.dir({RESULT: { includes }}, { depth: 99 });
};


//
module.exports = class Query {

  constructor(modelClass, verb = 'select') {
    this.modelClass = modelClass;
    this.schema     = modelClass.schema;

    this.query      = {
      table:    modelClass.schema.table,
      select:   null,
      verb:     verb,
      where:    [],
      whereNot: [],
      order:    [],
      distinct: null,
      group:    null,
      includes: {},
      options:  {},
      scopes:   [ 'default' ]
    };

    // filter on subclass
    const key = _.findKey(this.schema.subclasses, { name: this.modelClass.name });
    if (key) {
      this.query.where.push({
        [this.schema.subclass_column]: key
      });
    }
  }

  // UPDATE
  update(values, callback) {
    this.query.verb = 'update';
    this.values(values);
    return this.execute(callback);
  }

  // DELETE
  delete(callback) {
    this.query.verb = 'delete';
    return this.execute(callback);
  }
  
  destroy(callback) {
    return this.delete(callback);
  }

  // FROM
  from(table) {
    this.query.table = table;
    return this;
  }

  // WHERE
  where(where, params) {
    where = params !== undefined ? [where, params] : where;
    this.query.where.push(where);
    return this;
  }

  // WHERE NOT
  whereNot(whereNot) {
    this.query.whereNot.push(whereNot);
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
    this.query.limit  = 1;
    this.query.take   = 'first';
    return this.execute(callback);
  }

  // LAST
  last(callback) {
    this.query.limit  = 1;
    this.query.take   = 'last';
    return this.execute(callback);
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
  }

  // PAGE
  page(page, nb) {
    this.query.page   = parseInt(page, 10) || 1;
    this.query.page   = Math.max(1, this.query.page);
    this.query.nb     = parseInt(nb, 10) || 25;
    return this;
  }

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
    return this.execute(callback);
  }

  // SELECT
  select(select) {
    this.query.select = select;
    return this;
  }

  // COUNT
  count(callback) {
    const countQuery = new Query(this.modelClass);
    countQuery.query = _.cloneDeep(this.query);
    countQuery.query.verb   = 'count';
    countQuery.query.limit  = 1;
    delete countQuery.query.page;
    delete countQuery.query.nb;
    const count = (callback) => {
      countQuery.execute((err, rows) => {
        callback(err, rows && rows[0] && parseInt(rows[0].count, 10));
      });
    };

    if (callback) {
      return count(callback);
    }
    return new Promise((resolve, reject) => {
      count((err, count) => {
        err ? reject(err) : resolve(count);
      });
    });
  }

  // JOIN
  join(associationName, columns, type = 'left', name) {
    const { query, schema } = this;
    if (['left', 'inner', 'right'].indexOf(type) <0) {
      type = 'left';
    }

    const association = _.find(schema.associations, (association) => {
      return association[1] === associationName;
    });
    if (!association) {
      return this;
    }

    const attr        = association[1];
    const Obj         = association[2];
    const column      = association[3] || attr + '_id';
    const ref_column  = association[4] || 'id';
    
    query.join = {
      type: type.toUpperCase(),
      columns: columns && _.castArray(columns),
      table: Obj.schema.table,
      name: name || Obj.schema.table,
      column, ref_column
    };
    return this;
  }

  // SCOPES
  applyScopes() {
    const { query, schema } = this;
    query.scopes.forEach(scope => {
      if (!schema.scopes[scope]) {
        return;
      }
      schema.scopes[scope](this);
    });
  }

  // INCLUDES
  includes(includeParams) {
    const { query } = this;
    const pushInclude = includeParam => {
      merge(query.includes, includeParam);
    };
    _.forEach(_.concat([], includeParams), pushInclude);
    return this;
  }

  // FIND
  find(id, callback) {
    if (id === null || id === undefined || id.length === 0) {
      if (callback) {
        return callback(null, null);
      }
      return new Promise((resolve) => {
        resolve(null);
      });
    } else if (_.isString(id) || _.isNumber(id)) {
      return this.where({ id }).first(callback);
    } else if (_.isArray(id)) {
      id = _.compact(id);
      return this.where({ id }).first(callback);
    } else {
      return this.where(id).first(callback);
    }
  }

  // ORDER BY
  order(order) {
    this.query.order.push(order);
    return this;
  }

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

  getDb() {
    return dbs[this.schema.database];
  }

  // generate SQL
  toSQL() {
    const { query } = this;
    const db        = this.getDb();
    const sql = new Sql(this.query, db.driver.dialect)[this.query.verb + 'SQL']();
    // console.log(sql);
    query.generated = sql;
    return sql;
  }

  //
  paginate(callback) {
    const { query }     = this;
    if (!query.page) {
      return callback();
    }
    this.count((err, count) => {
      const nb_pages  = Math.ceil(count / query.nb);
      query.page    = Math.min(query.page, nb_pages);
      query.page    = Math.max(query.page, 1);
      query.offset  = (query.page - 1) * query.nb;
      query.limit   = query.nb;

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
        start:    query.offset + 1,
        end:      query.offset + Math.min(query.nb, count - query.offset),
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
    if (callback) {
      return this.doExecute(callback);
    }
    return new Promise((resolve, reject) => {
      this.doExecute((err, res) => {
        err ? reject(err) : resolve(res);
      });
    });
  }

  //
  doExecute(callback) {
    const { query, schema } = this;
    const db                = this.getDb();
    const { dialect }       = db.driver;
    const { esc }           = dialect;

    if (schema.scopes) {
      this.applyScopes();
    }

    if (query.order.length === 0 &&
        (query.take === 'first' || query.take === 'last')) {
      const order = query.take === 'first' ? 'ASC' : 'DESC';
      // default sort by primary key
      schema.primary.forEach(function(key) {
        query.order.push(`${esc}${key}${esc} ${order}`);
        // _this.query.order.push('`' + key + '` ' + order);
      });
    }


    this.paginate((err, pagination) => {
      
      this.runQuery((err, rows) => {
        if (err) {
          // console.log(err);
          return callback && callback(err);
        }
        if (!callback) {
          return;
        }
        if (query.verb === 'insert') {
          const insertId = dialect.insertId(rows);
          return callback(null, { insertId });
        } else if (query.verb !== 'select') {
          return callback(null, rows);
        }

        if (query.distinct || query.group) {
          return callback(null, rows);
        } else if (query.limit === 1 && (!rows || rows.length === 0 )) {
          return callback(null, null);
        } else if (query.verb === 'select') {
          rows = _.each(rows, row => schema.parseTypes(row));
        }

        async.eachSeries(_.keys(query.includes), (include, callback) => {
          this.loadAssociation(include, rows, callback);
        }, (err) => {
          if (query.verb === 'select') {
            rows = _.map(rows, row => this.newInstance(row));
          }

          if (pagination) {
            return callback(err, { pagination, rows });
          }
          if (query.limit === 1) {
            return callback(err, rows[0]);
          }

          callback(err, rows);
        });
      });
    });
  }

  runQuery(callback) {
    const { query } = this;
    const sqlQuery  = this.toSQL();
    const db        = this.getDb();
    db.query(sqlQuery.sql, sqlQuery.params, query.options, callback);
  }

  newInstance(row) {
    let instanceClass = this.modelClass;
    const type        = row[this.schema.subclass_column];
    if (this.schema.subclasses && type) {
      instanceClass = this.schema.subclasses[type];
    }
    return new instanceClass(row);
  }
};
