
const _         = require('lodash');

const Sql       = require('./Sql');
const dbs       = require('./dbs');
const logger    = require('../logger');

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
      joins:    [],
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
  async update(values) {
    this.query.verb = 'update';
    this.values(values);
    return await this.execute();
  }

  // DELETE
  async delete() {
    this.query.verb = 'delete';
    return await this.execute();
  }
  
  async destroy() {
    return await this.delete();
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
        if (DataTypes[column.type]) {
          result[column.name] = DataTypes[column.type].set(value);
        } else {
          // unknown type
          logger.warn(`Unknown type '${column.type}' for column '${column.name}'`);
        }
      } else {
        // unknown column (ignore)
      }
    }, {});
    return this;
  }

  // FIRST
  async first() {
    this.query.limit  = 1;
    this.query.take   = 'first';
    return await this.execute();
  }

  // LAST
  async last() {
    this.query.limit  = 1;
    this.query.take   = 'last';
    return await this.execute();
  }

  // LIMIT
  limit(limit, offset) {
    this.query.limit  = limit;
    if (offset) {
      logger.warn('Query.limit: offset is deprecated, use offset() instead');
    }
    return this;
  }

  // OFFSET
  offset(offset) {
    this.query.offset = offset;
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
  async list() {
    return await this.execute();
  }

  // SELECT
  select(select) {
    this.query.select = select;
    return this;
  }

  // COUNT
  async count() {
    const countQuery        = new Query(this.modelClass);
    countQuery.query        = _.cloneDeep(this.query);

    countQuery.query.verb   = 'count';
    countQuery.query.limit  = 1;
    delete countQuery.query.page;
    delete countQuery.query.nb;
  
    const rows    = await countQuery.execute();
    const count   = rows && rows[0] && Number(rows[0].count) || 0;
    return count;
  }

  // JOIN
  join(associationName, columns, type = 'LEFT', name) {
    const { query, schema } = this;

    if (_.isString(associationName)) {
        
      const association = _.find(schema.associations, (association) => association[1] === associationName);
      if (!association) {
        throw new Error('Missing association \'' + associationName + '\' on \'' + this.schema.table + '\' schema.');
      }

      const attr        = association[1];
      const Obj         = association[2];
      const src_column  = association[3] || attr + '_id';
      const column      = association[4] || 'id';
      const src_table   = this.schema.table;
      
      query.joins.push({
        type:     type.toUpperCase(),
        columns:  columns && _.castArray(columns),
        table:    Obj.schema.table,
        name:     name || Obj.schema.table,
        column,
        src_table,
        src_column,
      });

    } else {
      // custom join
      query.joins.push({
        type:     type.toUpperCase(),
        columns:    columns && _.castArray(columns),
        table:      associationName.table,
        name:       associationName.name || associationName.table,
        column:     associationName.column,
        src_table:  associationName.src_table || this.schema.table,
        src_column: associationName.src_column || 'id',
      });
    }
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
  async find(id) {
    if (id === null || id === undefined || id.length === 0) {
      return null;
    }

    if (_.isString(id) || _.isNumber(id)) {
      return await this.where({ id }).first();
    }

    if (_.isArray(id)) {
      id = _.compact(id);
      return await this.where({ id }).first();
    }
    return await this.where(id).first();
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
  async paginate() {
    const { query } = this;
    if (!query.page) {
      return;
    }
  
    const count = await this.count();
    const nb_pages  = Math.ceil(count / query.nb);
    query.page      = Math.min(query.page, nb_pages);
    query.page      = Math.max(query.page, 1);
    query.offset    = (query.page - 1) * query.nb;
    query.limit     = query.nb;

    const links = [];
    const page  = this.query.page;
    const start = Math.max(1, page - 5);
    for (let i = 0; i < 10; i++) {
      const p = start + i;
      if (p <= nb_pages) {
        links.push({ page: p, current: page === p });
      }
    }
    return {
      page:     this.query.page,
      nb:       this.query.nb,
      previous: page > 1 ? page - 1 : null,
      next:     page < nb_pages ? page + 1 : null,
      start:    query.offset + 1,
      end:      query.offset + Math.min(query.nb, count - query.offset),
      nb_pages,
      count,
      links,
    };
  }
  
  //
  async loadAssociation(include, rows) {
    const association = _.find(this.schema.associations, (association) => {
      return association[1] === include;
    });
  
    if (!association) {
      throw new Error(`Missing association '${include}' on '${this.schema.table}' schema.`);
    }
  
    const [type, attr, Obj, column = attr + '_id', ref_column = 'id', extraWhere] = association;
  
    const ids           = _.chain(rows).flatMap(column).uniq().compact().value();
    const defaultValue  = () => (type === 'has_many' ? [] : null);
  
    if (ids.length === 0) {
      rows.forEach((row) => row[attr] = defaultValue());
      return;
    }
  
    const where = { 
      [ref_column]: ids 
    };
    const subincludes = this.query.includes[include];
    let query = Obj.includes(subincludes).where(where);
    if (extraWhere) {
      query.where(extraWhere);
    }
  
    const objs = await query.list();
  
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
        row[attr] = objsByKey[row[column]] || defaultValue();
        return;
      }
      row[attr] = _.chain(row[column]).flatMap(id => objsByKey[id]).compact().value();
    });
}
  //
  async execute() {
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
      // Default sort by primary key
      schema.primary.forEach(function (key) {
        query.order.push(`${esc}${key}${esc} ${order}`);
      });
    }
  
    // force limit to 1 for first/last
    if (query.take === 'first' || query.take === 'last') {
      query.limit = 1;
    }

    const pagination  = await this.paginate();
    let rows          = await this.runQuery();

    if (query.verb === 'insert') {
      const insertId = dialect.insertId(rows);
      return { insertId };
    } else if (query.verb !== 'select') {
      return rows;
    }

    if (query.distinct || query.group) {
      return rows;
    } else if (query.limit === 1 && (!rows || rows.length === 0)) {
      return null;
    } else if (query.verb === 'select') {
      rows = _.each(rows, row => schema.parseTypes(row));
    }
    
    // Load associations
    for (let include of _.keys(query.includes)) {
      await this.loadAssociation(include, rows);
    }

    if (query.verb === 'select') {
      rows = _.map(rows, row => this.newInstance(row));
    }

    if (pagination) {
      return { pagination, rows };
    }

    if (query.limit === 1) {
      return rows[0];
    }

    return rows;

  }
  
  // run the query
  async runQuery() {
    const { query } = this;
    const sqlQuery  = this.toSQL();
    const db        = this.getDb();
    return await db.query(sqlQuery.sql, sqlQuery.params, query.options);
  }

  // new instance of model object
  newInstance(row) {
    let instanceClass = this.modelClass;
    const type        = row[this.schema.subclass_column];
    if (this.schema.subclasses && type) {
      instanceClass = this.schema.subclasses[type];
    }
    return new instanceClass(row);
  }
};
