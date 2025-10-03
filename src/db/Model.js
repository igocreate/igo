const _         = require('lodash');
const CachedQuery = require('./CachedQuery');

const Query     = require('./Query');
const Schema    = require('./Schema');
const ModelRegistry = require('./ModelRegistry');


const newQuery = (constructor, verb) => {
  if (constructor.getSchema().cache) {
    return new CachedQuery(constructor, verb);
  }
  return new Query(constructor, verb);
};

// Base Model class - plus de mixin !
class Model {

  constructor(values) {
    _.assign(this, values);
  }

  // Auto-registration dans le registry
  static {
    // Évite d'enregistrer la classe Model elle-même
    if (this.name !== 'Model' && this.schema) {
      const modelName = this.schema.name || this.name;
      ModelRegistry.register(modelName, this);
    }
  }

  // Lazy initialization du schema
  static getSchema() {
    if (!this._schemaInstance) {
      if (!this.schema) {
        throw new Error(`Model ${this.name} must define a static 'schema' property`);
      }

      // Auto-registration si pas déjà fait (utile pour les classes définies dans les tests)
      const modelName = this.schema.name || this.name;
      if (this.name !== 'Model' && !ModelRegistry.models.has(modelName)) {
        ModelRegistry.register(modelName, this);
      }

      this._schemaInstance = new Schema(this, this.schema);
    }
    return this._schemaInstance;
  }

  //
  assignValues(values) {
    const keys = _.keys(this.constructor.getSchema().colsByAttr);
    _.assign(this, _.pick(values, keys));
  }

  // returns object with primary keys
  primaryObject() {
    return _.pick(this, this.constructor.getSchema().primary);
  }

  // update
  async update(values) {
    values.updated_at = new Date();

    await newQuery(this.constructor, 'update')
    .unscoped()
    .values(values)
    .where(this.primaryObject())
    .execute();

    if (this.constructor.getSchema().cache) {
      const cache = require('../cache');
      await cache.del('_cached.' + this.constructor.getSchema().table);
    }

    this.assignValues(values);
    return this;
  }

  // reload
  async reload(includes) {
    const query = this.constructor.unscoped();
    includes && query.includes(includes);
    return await query.find(this.id);
  }

  // delete
  async delete() {
    return newQuery(this.constructor, 'delete').unscoped().where(this.primaryObject()).execute();
  }

  // destroy
  async destroy() {
    console.log('Model.destroy() is deprecated. Please use Model.delete() instead.');
    return newQuery(this.constructor, 'delete').unscoped().where(this.primaryObject()).execute();
  }

  // find by id
  static async find(id) {
    return await newQuery(this).find(id);
  }

  // create
  static async create(values, options) {
    const _this = this;
    const schema = this.getSchema();

    const now = new Date();
    const obj = new this(values);

    if (schema.subclasses && !obj[schema.subclass_column]) {
      obj[schema.subclass_column] = _.findKey(schema.subclasses, { name: this.name });
    }

    obj.created_at = obj.created_at || now;
    obj.updated_at = obj.updated_at || now;

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

  // delete
  static delete(id) {
    return newQuery(this, 'delete').unscoped().where({ id: id }).execute();
  }

  // delete all
  static deleteAll() {
    return newQuery(this, 'delete').unscoped().execute();
  }

  // destroy
  static destroy(id) {
    console.log('Model.destroy() is deprecated. Please use Model.delete() instead.');
    return newQuery(this, 'delete').unscoped().where({ id: id }).execute();
  }

  // destroy all
  static destroyAll() {
    console.log('Model.destroyAll() is deprecated. Please use Model.deleteAll() instead.');
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
    throw new Error('Invalid join argument for Model.join(). Must be a string, array, or object.');
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

module.exports = Model;
