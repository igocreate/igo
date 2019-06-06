
const _ = require('lodash');

module.exports = class Schema {

  constructor(values) {
    _.assign(this, values);

    this.primary          = values.primary || ['id'];
    this.subclass_column  = values.subclass_column || 'type';

    this.bool_columns     = _.filter(values.columns, column => _.startsWith(column, 'is_'));
    this.json_columns     = _(values.columns)
                              .filter(column => _.endsWith(column, '_json'))
                              .map(column => column.substring(0, column.length - 5))
                              .value();

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

};
