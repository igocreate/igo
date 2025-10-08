
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
    console.log('* Query.destroy() deprecated. Please use Query.delete() instead');
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
  join(join, columns, type) {
    if (_.isString(join)) {
      return this.joinOne(join, columns, type);
    } else if (_.isArray(join)) {
      return this.joinMany(join, columns, type);
    } else if (_.isObject(join)) {
      return this.joinNested(join);
    }
    throw new Error('Invalid join argument. Must be a string, array, or object.');
  }

  // JOIN ONE
  joinOne(associationName, columns, type = 'LEFT') {
    const { query } = this;
    const association = this._findAssociation(associationName, this.schema);
    query.joins.push({ src_schema: this.schema, association, columns, type, src_alias: this.schema.table });
    return this;
  }

  // JOIN MANY
  joinMany(associationNames, columns, type = 'LEFT') {
    _.forEach(associationNames, name => this.joinOne(name, columns, type));
    return this;
  }

  // JOIN NESTED
  joinNested(nestedAssociations) {
    const processJoin = (join, current_schema, current_alias) => {
      if (_.isString(join)) {
        this._addJoin(join, null, 'LEFT', current_schema, current_alias);
        return;
      }

      if (_.isArray(join)) {
        join.forEach(j => processJoin(j, current_schema, current_alias));
        return;
      }

      if (_.isObject(join)) {
        _.each(join, (value, key) => {
          const new_join_alias = key;
          const association = this._addJoin(key, null, 'LEFT', current_schema, current_alias);
          const next_schema = association[2].schema;
          processJoin(value, next_schema, new_join_alias);
        });
      }
    };
    processJoin(nestedAssociations, this.schema, this.schema.table);
    return this;
  }

  // Helper to find association
  _findAssociation(associationName, src_schema) {
    const association = _.find(src_schema.associations, assoc => assoc[1] === associationName);
    if (!association) {
      throw new Error(`Missing association '${associationName}' on '${src_schema.table}' schema.`);
    }
    if (association[0] !== 'belongs_to') {
      throw new Error(`Association '${associationName}' on '${src_schema.table}' schema is not a 'belongs_to' association.`);
    }
    return association;
  }

  // Helper to add join to query.joins
  _addJoin(associationName, columns, type, src_schema, src_alias_for_join) {
    const association = this._findAssociation(associationName, src_schema);
    this.query.joins.push({ src_schema, association, columns, type, src_alias: src_alias_for_join });
    return association;
  }

  // SCOPES
  applyScopes() {
    const { query, schema } = this;
    _.forOwn(query.scopes, (scope) => {
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
    if (id === null || id === undefined) {
      return null;
    }

    if (_.isString(id) || _.isNumber(id)) {
      return await this.where({ id }).first();
    }

    if (_.isArray(id)) {
      id = _.compact(id);
      if (id.length === 0) {
        return null;
      }
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
    const sql       = new Sql(this.query, db.driver.dialect)[this.query.verb + 'SQL']();
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

    let schema      = this.schema;
    let association = null;
    let parts, path = null; 

    if (include.indexOf('.') !== -1) {
      // nested include
      parts = include.split('.');
      path = parts.slice(0, parts.length - 1).join('.') + '.';
      for (const part of parts) {
        association = _.find(schema.associations, (assoc) => {
          return assoc[1] === part;
        });
        schema = association ? association[2].schema : null;
      }
    } else {
      association = _.find(schema.associations, (association) => {
        return association[1] === include;
      });
    }
  
    if (!association) {
      throw new Error(`Missing association '${include}' on '${schema.table}' schema.`);
    }
  
    const [type, attr, Obj, column = attr + '_id', ref_column = 'id', extraWhere] = association;
    
    let column_path     = column;
    if (path) {
      if (type === 'has_many') {
        column_path = parts.slice(0, parts.length - 2).join('.');
        if (column_path) {
          column_path += '.';
        }
        column_path += ref_column;
      } else {
        column_path = path + column;
      }
      
    }

    const ids           = _.chain(rows).flatMap(column_path).uniq().compact().value();
    const defaultValue  = () => (type === 'has_many' ? [] : null);
  
    if (ids.length === 0) {
      _.forEach(rows, (row) => row[attr] = defaultValue());
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

    const attr_path = path ? path + attr : attr;
    _.forEach(rows, (row) => {
      const value = _.get(row, column_path);
      if (!Array.isArray(value)) {
        _.set(row, attr_path, objsByKey[value] || defaultValue());
        return;
      }
      row[attr] = _.chain(value).flatMap(id => objsByKey[id]).compact().value();
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
      _.forEach(schema.primary, (key) => {
        query.order.push(`${esc}${schema.table}${esc}.${esc}${key}${esc} ${order}`);
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
      rows = _.each(rows, row => {
        schema.parseTypes(row);

        // parse joins values
        _.forEach(this.query.joins, (join) => {
          const { src_schema, association } = join;
          const [assoc_type, name, Obj, src_column, column] = association;
          Obj.schema.parseTypes(row, `${name}__`);
        });
      });
    }

    if (query.verb === 'select') {
      rows = _.map(rows, row => {
        const instance = this.newInstance(row);
        
        if (this.query.joins.length === 0) {
          return instance;
        }
        
        const createdInstances = new Map();
        createdInstances.set(this.schema, instance);

        _.forEach(this.query.joins, (join) => {
          const { src_schema, association } = join;
          const [assoc_type, name, Obj, src_column, column] = association;
          const table_alias = name;

          const params = {};
          Obj.schema.columns.forEach(col => {
            const alias = `${table_alias}__${col.attr}`;
            params[col.attr] = row[alias];
            delete instance[alias];
          });

          const joinInstance = this.newInstance(params, Obj);

          const parentInstance = createdInstances.get(src_schema);
          
          if (parentInstance) {
            parentInstance[name] = joinInstance || null;
            if (joinInstance) {
              createdInstances.set(Obj.schema, joinInstance);
            }
          }
        });

        return instance;
      });
    }
        
    // Load associations
    for (let include of _.keys(query.includes)) {
      await this.loadAssociation(include, rows);
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
  newInstance(row, instanceClass=this.modelClass) {
    // let instanceClass = this.modelClass;
    if (_.every(this.schema.primary, key => row[key] === null)) {
      return null; // no primary key, no instance
    }
    const type = row[this.schema.subclass_column];
    if (this.schema.subclasses && type) {
      instanceClass = this.schema.subclasses[type];
    }
    return new instanceClass(row);
  }
};
