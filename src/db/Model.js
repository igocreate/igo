

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
    update(values, callback) {
      values.updated_at = new Date();
      const update = (callback) => {
        this.beforeUpdate(values, () => {
          newQuery(this.constructor, 'update').unscoped().values(values).where(this.primaryObject()).execute((err) => {
            this.assignValues(values);
            callback(err, this);
          });
        });
      };

      if (callback) {
        return update(callback);
      }
      return new Promise((resolve, reject) => {
        update((err, result) => {
          err ? reject(err) : resolve(result);
        });
      });
    }

    // reload
    reload(includes, callback) {
      if (!callback) {
        callback = includes;
        includes = null;
      }
      const reload = (callback) => {
        const query = this.constructor.unscoped();
        includes && query.includes(includes);
        query.find(this.id, callback);
      };

      if (callback) {
        return reload(callback);
      }
      return new Promise((resolve, reject) => {
        reload((err, result) => {
          err ? reject(err) : resolve(result);
        });
      });
    }

    // destroy
    destroy(callback) {
      newQuery(this.constructor, 'delete').unscoped().where(this.primaryObject()).execute(callback);
    }

    beforeCreate(callback)          { callback(); }
    beforeUpdate(values, callback)  { callback(); }


    // find by id
    static find(id, callback) {
      return newQuery(this).find(id, callback);
    }

    // create
    static create(values, options, callback) {
      const _this       = this;

      if (_.isFunction(values)) {
        callback = values;
      }
      if (_.isFunction(options)) {
        callback = options;
      }
      const now = new Date();
      const obj = new this(values);
      if (this.schema.subclasses && !obj[this.schema.subclass_column]) {
        obj[this.schema.subclass_column] = _.findKey(this.schema.subclasses, { name: this.name });
      }

      obj.created_at = obj.created_at || now;
      obj.updated_at = obj.updated_at || now;
      
      const create = (callback) => {
        obj.beforeCreate(() => {
          const query = newQuery(_this, 'insert').values(obj).options(options);
          query.execute((err, result) => {
            if (err) {
              return callback && callback(err, result);
            }
            const { insertId } = result;
            if (insertId) {
              return _this.unscoped().find(insertId, callback);
            }
            _this.unscoped().find(obj.primaryObject(), callback);
          });
        });
      };

      if (callback) {
        return create(callback);
      }
      return new Promise((resolve, reject) => {
        create((err, res) => {
          err ? reject(err) : resolve(res);
        });
      });

    }

    // return first
    static first(callback) {
      return newQuery(this).first(callback);
    }

    // return last
    static last(callback) {
      return newQuery(this).last(callback);
    }

    // return all
    static list(callback) {
      return newQuery(this).list(callback);
    }

    static all(callback) {
      console.log('* all() deprecated. Please use list() instead');
      return this.list(callback);
    }

    //
    static select(select) {
      return newQuery(this).select(select);
    }

    // filter
    static where(where, params) {
      return newQuery(this).where(where, params);
    }

    // limit
    static limit(offset, limit) {
      return newQuery(this).limit(offset, limit);
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
    static count(callback) {
      return newQuery(this).count(callback);
    }

    // destroy
    static destroy(id, callback) {
      return newQuery(this, 'delete').unscoped().where({ id: id }).execute(callback);
    }

    // destroy all
    static destroyAll(callback) {
      return newQuery(this, 'delete').unscoped().execute(callback);
    }

    //
    static update(values, callback) {
      values.updated_at = new Date();
      return newQuery(this).unscoped().update(values, callback);
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
