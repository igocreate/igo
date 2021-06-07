
const _         = require('lodash');
const utils     = require('../utils');

const DataTypes = require('./DataTypes');


module.exports = class Schema {

  constructor(values) {
    _.assign(this, values);

    this.primary          = values.primary || ['id'];
    this.subclass_column  = values.subclass_column || 'type';
    this.database         = values.database || 'main';

    // Map columns
    this.columns = _.map(values.columns, column => {
      if (typeof column === 'object') {
        column.attr = column.attr || column.name;
        return column;
      }
      // Deprecated "is_" prefix
      if (_.startsWith(column, 'is_')) {
        console.log(`warn: "is_" prefix is deprecated for ${this.table}.${column}, please use {name:'${column}', type: 'boolean'}.`);
        return {name: column, type: 'boolean', attr: column};
      }
      // Deprecated "_json" suffix
      if (_.endsWith(column, '_json')) {
        console.log(`warn: "_json" suffix is deprecated for ${this.table}.${column} , please use {name:'${column}', type: 'json'}.`);
        return {name: column, type: 'json', attr: column.substring(0, column.length - 5)}
      }
      return {name: column, attr: column, type: 'default'};
    });
    this.colsByName = _.keyBy(this.columns, 'name');
    this.colsByAttr = _.keyBy(this.columns, 'attr');

    // asynchronous loading of associations for circular dependencies
    process.nextTick(() => {
      if (_.isFunction(values.associations)) {
        this.associations = values.associations();
      };
      if (_.isFunction(values.subclasses)) {
        this.subclasses = values.subclasses();
      };
    });
  }

  parseTypes(row) {
    _.forOwn(row, (value, key) => {
      const column  = this.colsByName[key];
      const type    = column && DataTypes[column.type];
      if (column && type) {
        row[column.attr] = type.get(value);
      }
    });
  }

};
