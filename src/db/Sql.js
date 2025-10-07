
const _       = require('lodash');

module.exports = class Sql {
  
  constructor(query, dialect) {
    this.query    = query;
    this.dialect  = dialect;
    this.i        = 1;
  }

  // SELECT SQL
  selectSQL() {
    const { query, dialect } = this;
    const { esc } = dialect;

    let sql       = 'SELECT ';
    const params  = [];

    if (query.distinct) {
      const joined = query.distinct.join(`${esc},${esc}`);
      sql += `DISTINCT ${esc}${joined}${esc} `;
    } else if (query.select) {
      let select_sql = query.select;
      _.each(query.joins, join => {
        const [assoc_type, name, Obj] = join.association;
        select_sql = select_sql.replace(new RegExp(`\\b${Obj.schema.table}\\b`, 'g'), name);
      });
      sql += select_sql + ' ';
    } else {
      sql += `${esc}${query.table}${esc}.*`;

      _.each(query.joins, join => {
        const { src_schema, association } = join;
        const [ assoc_type, name, Obj, src_column, column] = association;
        const table_alias = name;
        sql += ', ';
        if (join.columns) {
          // add only specified columns
          sql += _.map(join.columns, (column) => {
            if (column.indexOf('.') > -1 || column.toLowerCase().indexOf(' as ') > -1) {
              return column; // already qualified or aliased
            }
            // 
            return `${esc}${table_alias}${esc}.${esc}${column}${esc} as ${esc}${table_alias}__${column}${esc}`;
          }).join(', ');
        } else {
          // add all columns from joined table          
          sql += _.map(Obj.schema.columns, (column) => {
            return `${esc}${table_alias}${esc}.${esc}${column.name}${esc} as ${esc}${table_alias}__${column.name}${esc}`;
          }).join(', ');
        }
      });
      sql += ' ';
    }

    // from
    sql += `FROM ${esc}${query.table}${esc} `;

    // joins
    sql += this.addJoins();

    // where
    sql += this.whereSQL(params);

    // whereNot
    sql += this.whereNotSQL(params);

    // group
    sql += this.groupSQL();

    // order by
    sql += this.orderSQL();


    // limit
    if (query.limit) {
      sql += dialect.limit(this.i++, this.i++);
      params.push(query.offset || 0);
      params.push(query.limit);
    }

    const ret = {
      sql: sql.trim(),
      params: params
    };
    // console.dir(ret);
    return ret;
  };

  // COUNT SQL
  countSQL() {
    const { query, dialect } = this;
    const { esc } = dialect;

    // select
    let sql = `SELECT COUNT(0) as ${esc}count${esc} `;
    const params = [];

    // from
    sql += `FROM ${esc}${query.table}${esc} `;

    // joins
    sql += this.addJoins();

    // where
    sql += this.whereSQL(params);

    // whereNot
    sql += this.whereNotSQL(params);

    var ret = {
      sql: sql.trim(),
      params: params
    };
    // console.dir(ret);
    return ret;
  };

  // JOINS
  addJoins() {
    const { query, dialect } = this;
    const { esc }   = dialect;

    let sql = '';
    _.each(query.joins, join => {
      const { src_schema, type, association, src_alias } = join;
      const [ assoc_type, name, Obj, src_column, column] = association;
      const src_table_alias = src_alias || src_schema.table;
      const table       = Obj.schema.table;
      sql += `${type.toUpperCase()} JOIN ${esc}${table}${esc} AS ${esc}${name}${esc} ON ${esc}${name}${esc}.${esc}${column}${esc} = ${esc}${src_table_alias}${esc}.${esc}${src_column}${esc} `;
    });
    return sql;
  }

  // WHERE
  whereSQL(params, not) {
    const { query, dialect } = this;
    const { esc } = dialect;

    const sqlwhere = [];
    const wheres = not ? query.whereNot : query.where;
    _.forEach(wheres, (where) => {
      if (_.isArray(where)) {
        // where is an array with sql string and params
        if (not) {
          console.warn('Where clause contains a string with whereNot, this is not supported');
          return;
        }
        // where is an array
        let s = where[0];
        while (s.indexOf('$?') > -1) {
          s = s.replace('$?', dialect.param(this.i++));
        }
        sqlwhere.push(s + ' ');
        if (_.isArray(where[1])) {
          Array.prototype.push.apply(params, where[1]);
        } else {
          params.push(where[1]);
        }
      } else if (_.isString(where)) {
        // where is a string
        if (not) {
          console.warn('Where clause is a string with whereNot, this is not supported');
          return;
        }
        sqlwhere.push(where + ' ');
      } else {
        // where is an object
        _.forOwn(where, (value, key) =>{
          let column_alias;
          if (key.indexOf('.') > -1 && key.indexOf('`') === -1) {
            column_alias = _.map(key.split('.'), (part) => (`${esc}${part}${esc}`)).join('.');
          } else {
            column_alias = `${esc}${query.table}${esc}.${esc}${key}${esc}`
          }
          if (value === null || value === undefined) {
            sqlwhere.push(`${column_alias} IS ${not ? 'NOT NULL' : 'NULL'} `);
          } else if (_.isArray(value) && value.length === 0) {
            // where in empty array
            sqlwhere.push(not ? 'TRUE ': 'FALSE ');
          } else if (_.isArray(value)) {
            sqlwhere.push(`${column_alias} ${not ? dialect.notin : dialect.in} (${dialect.param(this.i++)}) `);
            params.push(value);
          } else {
            sqlwhere.push(`${column_alias} ${not ? '!=' : '='} ${dialect.param(this.i++)} `);
            params.push(value);
          }
        });
      }
    });
    
    if (sqlwhere.length) {
      const ret = (not && query.where.length > 0) ? 'AND ' : 'WHERE ';
      return ret + sqlwhere.join('AND ');
    }
    return '';
  };

  //
  whereNotSQL(params) {
    return this.whereSQL(params, true);
  };

  // INSERT SQL
  insertSQL() {
    const { query, dialect } = this;
    const { esc } = dialect;

    // insert into
    let sql = `INSERT INTO ${esc}${query.table}${esc}`;

    // columns
    const columns = [], values = [], params = [];
    _.forOwn(query.values, function(value, key) {
      columns.push(`${esc}${key}${esc}`);
      values.push(dialect.param(this.i++));
      params.push(value);
    }.bind(this));

    if (!columns.length && dialect.emptyInsert) {
      sql += dialect.emptyInsert;
    } else {
      sql += '(' + columns.join(',') + ') ';
      sql += 'VALUES(' + values.join(',') + ') ';
    }

    sql += dialect.returning;
    return { sql, params };
  };

  // UPDATE SQL
  updateSQL() {
    const { query, dialect } = this;
    const { esc } = dialect;

    // update set
    let sql = `UPDATE ${esc}${query.table}${esc} SET `;

    // columns
    const columns = [], params = [];
    _.forOwn(query.values, (value, key) => {
      columns.push(`${esc}${key}${esc} = ${dialect.param(this.i++)}`);
      params.push(value);
    });

    sql += columns.join(', ') + ' ';

    // where
    sql += this.whereSQL(params);

    // whereNot
    sql += this.whereNotSQL(params);

    const ret = {
      sql: sql,
      params: params
    };
    return ret;
  };

  // DELETE SQL
  deleteSQL() {
    const { query, dialect } = this;
    const { esc }   = dialect;

    // delete
    let sql = `DELETE FROM ${esc}${query.table}${esc} `;

    // columns
    var params = [];

    // where
    sql += this.whereSQL(params);

    // whereNot
    sql += this.whereNotSQL(params);

    var ret = {
      sql: sql,
      params: params
    };
    return ret;
  };

  // ORDER BY SQL
  orderSQL() {
    const { query } = this;

    if (!query.order || !query.order.length) {
      return '';
    }

    var sql = 'ORDER BY ' + query.order.join(', ') + ' ';

    return sql;
  };


  // GROUP BY SQL
  groupSQL() {
    const { query } = this;
    
    if (_.isEmpty(query.group )) {
      return '';
    }

    var sql = 'GROUP BY ' + query.group.join(', ') + ' ';
    return sql;
  };
};
