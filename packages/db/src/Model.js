const _         = require('lodash');
const CachedQuery = require('./CachedQuery');

const Query     = require('./Query');
const Schema    = require('./Schema');


const newQuery = (constructor, verb) => {
  if (constructor.schema.cache) {
    return new CachedQuery(constructor, verb);
  }
  return new Query(constructor, verb);
};

const instantiate = (modelClass, values, now) => {
  const instance = new modelClass(values);
  const { subclasses, subclass_column } = modelClass.schema;
  if (subclasses && !instance[subclass_column]) {
    instance[subclass_column] = _.findKey(subclasses, { name: modelClass.name });
  }
  instance.created_at = instance.created_at || now;
  instance.updated_at = instance.updated_at || now;
  return instance;
};

const DEFAULT_CHUNK_SIZE = 1000;

// PostgreSQL binds at most 65,535 parameters per statement
const MAX_PARAMS         = 65535;

// Simple mixin implementation to set the schema as a static attribute
module.exports = function(schema) {

  class Model {

    constructor(values) {
      _.assign(this, values);
    }

    //
    assignValues(values) {
      const keys = _.keys(Model.schema.colsByAttr);
      _.assign(this, _.pick(values, keys));
    }

    // returns object with primary keys
    primaryObject() {
      return _.pick(this, this.constructor.schema.primary);
    }

    // update
    async update(values) {
      values.updated_at = new Date();
      await this.beforeUpdate(values);

      await newQuery(this.constructor, 'update')
      .unscope()
      .values(values)
      .where(this.primaryObject())
      .execute();

      this.assignValues(values);
      return this;
    }

    // reload
    async reload(includes) {
      const query = this.constructor.unscope();
      includes && query.includes(includes);
      return await query.find(this.id);
    }

    // delete
    async delete() {
      await this.beforeDelete();
      return newQuery(this.constructor, 'delete').unscope().where(this.primaryObject()).execute();
    }

    async beforeCreate() { }
    async beforeUpdate(_values) { }
    async beforeDelete() { }


    // find by id
    static async find(id) {
      return await newQuery(this).find(id);
    }

    // create
    static async create(values, options) {
      const _this = this;
      const obj   = instantiate(this, values, new Date());

      const create = async () => {
        await obj.beforeCreate();

        const query = newQuery(_this, 'insert').values(obj).options(options);
        const result = await query.execute();

        if (result === null) {
          return null;
        }
        if (result.err) {
          throw result.err;
        }

        const { insertId } = result;
        if (insertId) {
          return _this.unscope().find(insertId);
        }
        return _this.unscope().find(obj.primaryObject());
      };

      return await create();
    }

    // one INSERT per chunk, all-or-nothing: returns the number of rows inserted
    static async createMany(list, { chunkSize = DEFAULT_CHUNK_SIZE } = {}) {
      if (!Number.isInteger(chunkSize) || chunkSize < 1) {
        throw new Error(`createMany: chunkSize must be a positive integer, got ${chunkSize}`);
      }
      const now       = new Date();
      const instances = list.map(values => instantiate(this, values, now));
      for (const instance of instances) {
        await instance.beforeCreate();
      }

      const rowsPerChunk = Math.min(chunkSize, Math.floor(MAX_PARAMS / this.schema.columns.length));
      const chunks       = _.chunk(instances, rowsPerChunk);
      const insertChunks = async () => {
        let count = 0;
        for (const chunk of chunks) {
          const result = await newQuery(this, 'insert').values(chunk).execute();
          count += result.count;
        }
        return count;
      };

      if (chunks.length > 1) {
        return await newQuery(this).getDb().transaction(insertChunks);
      }
      return await insertChunks();
    }


    // return first
    static first() {
      return newQuery(this).first();
    }

    // return last
    static last() {
      return newQuery(this).last();
    }

    // return list
    static list() {
      return newQuery(this).list();
    }

    //
    static select(select) {
      return newQuery(this).select(select);
    }

    // filter
    static where(where, params) {
      return newQuery(this).where(where, params);
    }

    // filter
    static whereNot(whereNot) {
      return newQuery(this).whereNot(whereNot);
    }

    // limit
    static limit(limit) {
      return newQuery(this).limit(limit);
    }

    // offset
    static offset(offset) {
      return newQuery(this).offset(offset);
    }

    // page
    static page(page, nb) {
      return newQuery(this).page(page, nb);
    }

    // order
    static order(order) {
      return newQuery(this).order(order);
    }

    // order with a raw SQL expression — never call with user input
    static orderRaw(order) {
      return newQuery(this).orderRaw(order);
    }

    // distinct
    static distinct(columns) {
      return newQuery(this).distinct(columns);
    }

    // group
    static group(columns) {
      return newQuery(this).group(columns);
    }

    // count
    static count() {
      return newQuery(this).count();
    }

    // delete
    static delete(id) {
      return newQuery(this, 'delete').unscope().where({ id }).execute();
    }

    // delete all
    static async deleteAll() {
      return newQuery(this, 'delete').unscope().execute();
    }

    //
    static update(values, ) {
      values.updated_at = new Date();
      return newQuery(this).unscope().update(values, );
    }

    // includes
    static includes(includes) {
      return newQuery(this).includes(includes);
    }

    // join
    static join(associationName, columns, type='LEFT') {
      const query = newQuery(this);
      if (_.isString(associationName)) {
        return query.joinOne(associationName, columns, type);
      } else if (_.isArray(associationName)) {
        return query.joinMany(associationName, columns, type);
      } else if (_.isObject(associationName)) {
        return query.joinNested(associationName);
      }
      console.warn('Invalid join argument for Model.join(). Must be a string, array, or object.');
    }

    // unscope
    static unscope(...clauses) {
      return newQuery(this).unscope(...clauses);
    }

    //scope
    static scope(scope) {
      return newQuery(this).scope(scope);
    }


  }

  Model.schema = new Schema(schema);

  return Model;
};
