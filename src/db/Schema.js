
const _         = require('lodash');

const DataTypes = require('./DataTypes');
const ModelRegistry = require('./ModelRegistry');


module.exports = class Schema {

  constructor(modelClass, values) {
    this.modelClass       = modelClass;
    this.table            = values.table;
    this.primary          = values.primary || ['id'];
    this.subclass_column  = values.subclass_column || 'type';
    this.database         = values.database || 'main';
    this.cache            = values.cache;
    this.scopes           = values.scopes;

    // Map columns
    this.columns = _.map(values.columns, column => {
      if (typeof column === 'object') {
        column.attr = column.attr || column.name;
        return column;
      }
      return { name: column, attr: column, type: 'default' };
    });
    this.colsByName = _.keyBy(this.columns, 'name');
    this.colsByAttr = _.keyBy(this.columns, 'attr');

    // Store raw association/subclass functions for lazy loading
    this._associationsFn = values.associations;
    this._subclassesFn = values.subclasses;
    this._resolvedAssociations = null;
    this._resolvedSubclasses = null;
  }

  // Lazy loading des associations avec résolution via ModelRegistry
  get associations() {
    if (!this._resolvedAssociations && this._associationsFn) {
      const rawAssocs = _.isFunction(this._associationsFn)
        ? this._associationsFn()
        : this._associationsFn;

      this._resolvedAssociations = rawAssocs.map(assoc => {
        const [type, name, modelRef, ...rest] = assoc;
        const ModelClass = ModelRegistry.resolve(modelRef);
        return [type, name, ModelClass, ...rest];
      });
    }
    return this._resolvedAssociations || [];
  }

  // Lazy loading des subclasses
  get subclasses() {
    if (!this._resolvedSubclasses && this._subclassesFn) {
      const rawSubclasses = _.isFunction(this._subclassesFn)
        ? this._subclassesFn()
        : this._subclassesFn;

      // Résoudre les subclasses si ce sont des strings
      this._resolvedSubclasses = _.mapValues(rawSubclasses, subclass => {
        if (typeof subclass === 'string') {
          return ModelRegistry.resolve(subclass);
        }
        return subclass;
      });
    }
    return this._resolvedSubclasses || null;
  }

  parseTypes(row, prefix='') {
    _.forOwn(row, (value, key) => {
      if (prefix && !key.startsWith(prefix)) {
        return; // skip if not prefixed
      }
      key = key.slice(prefix.length);
      const column  = this.colsByName[key];
      const type    = column && DataTypes[column.type];
      if (type) {
        row[prefix + column.attr] = type.get(value);
      }
    });
  }

};
