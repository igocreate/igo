
const _       = require('lodash');
const utils   = require('../utils');

const columnTypes = require('./columnTypes');

module.exports = class Schema {

  constructor(values) {
    _.assign(this, values);

    this.primary          = values.primary || ['id'];
    this.subclass_column  = values.subclass_column || 'type';

    // Map columns
    this.columns = _.map(values.columns, column => {
      if (typeof column === 'object') {
        column.attr = column.attr || column.name;
        return column;
      }
      // Deprecated "is_" prefix
      if (_.startsWith(column, 'is_')) {
        console.log('warn: "is_" prefix is deprecated for schema columns, please use an object with a type');
        return {name: column, type: 'boolean', attr: column};
      }
      // Deprecated "_json" suffix
      if (_.endsWith(column, '_json')) {
        console.log('warn: "_json" suffix is deprecated for schema columns, please use an object with a type instead');
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
    return _.transform(row, (result, value, key) => {
      const column = this.colsByName[key];

      if (!column) {
        result[key] = value;
        return ;
      }

      result[column.attr] = columnTypes.get(column.type, value);;
    });
  }

};
