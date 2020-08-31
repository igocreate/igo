
const _       = require('lodash');
const logger  = require('../../src/logger');
const utils   = require('../utils');
const { json } = require('body-parser');

module.exports = class Schema {

  constructor(values) {
    _.assign(this, values);

    this.primary          = values.primary || ['id'];
    this.subclass_column  = values.subclass_column || 'type';

    // Deprecated "is_" prefix
    if (_.find(values.columns, column => _.isString(column) && _.startsWith(column, 'is_'))) {
      logger.warn('"is_" prefix is deprecated for schema columns, please use an object with a type');
      values.columns = _.map(values.columns, column => {
        if (!_.isString(column) || !_.startsWith(column, 'is_')) {
          return column;
        }
        return {name: column, type: 'boolean'};
      });
    }

    // Deprecated "_json" suffix
    if (_.find(values.columns, column => _.isString(column) && _.endsWith(column, '_json'))) {
      logger.warn('"_json" suffix is deprecated for schema columns, please use an object with a type instead');
      values.columns = _.map(values.columns, column => {
        if (!_.isString(column) || !_.endsWith(column, '_json')) {
          return column;
        }
        return {name: column, type: 'json', attr: column.substring(0, column.length - 5)};
      });
    }

    this.col_names    = _.map(values.columns, column => _.isString(column) ? column : column.name);
    this.bool_columns = this._getType('boolean', values);
    this.json_columns = this._getType('json', values);

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


  _getType(type, values) {
    return _.filter(values.columns, column => _.isObject(column) && column.type === type);
  }

  serializeTypes(obj, isUpdate) {
    _.each(this.json_columns, (json_column) => {
      if (!isUpdate || obj[json_column.attr] !== undefined) {
        obj[json_column.name] = utils.toJSON(obj[json_column.attr]);
      }
    });
    _.each(this.bool_columns, (bool_column) => {
      if (!isUpdate || obj[bool_column.name] !== undefined) {
        obj[bool_column.name] = !!obj[bool_column.name];
      }
    });
  }
  
  parseTypes(row) {
    _.each(this.json_columns, (json_column) => {
      row[json_column.attr] = utils.fromJSON(row[json_column.name]);
      delete row[json_column.name];
    });
    _.each(this.bool_columns, (bool_column) => {
      row[bool_column.name] = !!row[bool_column.name];
    });
  }

};
