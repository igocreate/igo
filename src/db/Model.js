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
      .unscoped()
      .values(values)
      .where(this.primaryObject())
      .execute();
    
    this.assignValues(values);
    return this;
    }

    // reload
    async reload(includes) {

      const query = this.constructor.unscoped();
      includes && query.includes(includes);
      return await query.find(this.id);

    }

    // destroy
    destroy() {
      return newQuery(this.constructor, 'delete').unscoped().where(this.primaryObject()).execute();
    }

    async beforeCreate() { }
    async beforeUpdate(values) { }


    // find by id
    static async find(id) {
      return await newQuery(this).find(id);
    }

    // create
    static async create(values, options) {
      const _this = this;
    
      const now = new Date();
      const obj = new this(values);
    
      if (this.schema.subclasses && !obj[this.schema.subclass_column]) {
        obj[this.schema.subclass_column] = _.findKey(this.schema.subclasses, { name: this.name });
      }
    
      obj.created_at = obj.created_at || now;
      obj.updated_at = obj.updated_at || now;
    
      const create = async () => {
        await obj.beforeCreate();
    
        const query = newQuery(_this, 'insert').values(obj).options(options);
        const result = await query.execute();
    
        if (result.err) {
          throw result.err;
        }
    
        const { insertId } = result;
        if (insertId) {
          return _this.unscoped().find(insertId);
        }
        return _this.unscoped().find(obj.primaryObject());
      };
    
      return await create();
    }
    
    

    // return first
    static first() {
      return newQuery(this).first();
    }

    // return last
    static last() {
      return newQuery(this).last();
    }

    // return all
    static list() {
      return newQuery(this).list();
    }

    static all() {
      console.log('* all() deprecated. Please use list() instead');
      return this.list();
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

    // join
    static join(association, columns, type, name) {
      return newQuery(this).join(association, columns, type, name);
    }

    // destroy
    static destroy(id, ) {
      return newQuery(this, 'delete').unscoped().where({ id: id }).execute();
    }

    // destroy all
    static destroyAll() {
      return newQuery(this, 'delete').unscoped().execute();
    }

    //
    static update(values, ) {
      values.updated_at = new Date();
      return newQuery(this).unscoped().update(values, );
    }

    // includes
    static includes(includes) {
      return newQuery(this).includes(includes);
    }

    //unscoped
    static unscoped() {
      return newQuery(this).unscoped();
    }

    //scope
    static scope(scope) {
      return newQuery(this).scope(scope);
    }

  }

  Model.schema = new Schema(schema);

  return Model;
};
