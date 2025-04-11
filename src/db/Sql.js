
const _       = require('lodash');

/**
 * @type Class
 */
var Sql = function(query, dialect) {

  const { esc } = dialect;
  let i = 1;

  // SELECT SQL
  this.selectSQL = function() {

    let sql       = 'SELECT ';
    const params  = [];

    if (query.distinct) {
      const joined = query.distinct.join(`${esc},${esc}`);
      sql += `DISTINCT ${esc}${joined}${esc} `;
    } else if (query.select) {
      sql += query.select + ' ';
    } else {
      sql += `${esc}${query.table}${esc}.* `;
    }

    // joins columns
    _.each(query.joins, join => {
      _.each(join.columns, column => {
        const col = column.indexOf('`') > -1 || column.indexOf(' as ') > -1 ? column : `${esc}${column}${esc}`;
        sql += `,${esc}${join.name}${esc}.${col} `;
      });
    });

    // from
    sql += `FROM ${esc}${query.table}${esc} `;

    // joins
    _.each(query.joins, join => {
      const { type, table, column, src_table, src_column, name } = join;
      sql += `${type.toUpperCase()} JOIN ${esc}${table}${esc} as ${esc}${name}${esc} ON ${esc}${name}${esc}.${esc}${column}${esc} = ${esc}${src_table}${esc}.${esc}${src_column}${esc} `;
    });

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
      sql += dialect.limit(i++, i++);
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
  this.countSQL = function() {
    // select
    let sql = `SELECT COUNT(0) as ${esc}count${esc} `;
    const params = [];

    // from
    sql += `FROM ${esc}${query.table}${esc} `;

    if (query.join) {
      const { type, table, column, ref_column, name } = query.join;
      sql += `${type} JOIN ${esc}${table}${esc} as ${esc}${name}${esc} ON ${esc}${name}${esc}.${esc}${ref_column}${esc} = ${esc}${query.table}${esc}.${esc}${column}${esc} `;
    }

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

  // WHERE
  this.whereSQL = function(params) {
    var sqlwhere = [];
    _.forEach(query.where, function(where) {
      if (_.isArray(where)) {
        let s = where[0];
        while (s.indexOf('$?') > -1) {
          s = s.replace('$?', dialect.param(i++));
        }
        sqlwhere.push(s + ' ');
        if (_.isArray(where[1])) {
          Array.prototype.push.apply(params, where[1]);
        } else {
          params.push(where[1]);
        }
      } else if (_.isString(where)) {
        sqlwhere.push(where + ' ');
      } else {
        _.forEach(where, function(value, key) {
          if (value === null || value === undefined) {
            sqlwhere.push(`${esc}${query.table}${esc}.${esc}${key}${esc} IS NULL `);
          } else if (_.isArray(value) && value.length === 0) {
            // where in empty array --> FALSE
            sqlwhere.push('FALSE ');
          } else if (_.isArray(value)) {
            sqlwhere.push(`${esc}${query.table}${esc}.${esc}${key}${esc} ${dialect.in} (${dialect.param(i++)}) `);
            params.push(value);
          } else {
            sqlwhere.push(`${esc}${query.table}${esc}.${esc}${key}${esc} = ${dialect.param(i++)} `);
            params.push(value);
          }
        });
      }
    });
    if (sqlwhere.length) {
      return 'WHERE ' + sqlwhere.join('AND ');
    }
    return '';
  };

  //
  this.whereNotSQL = function(params) {
    var sqlwhere = [];
    _.forEach(query.whereNot, function(whereNot) {
      _.forEach(whereNot, function(value, key) {
        if (value === null) {
          sqlwhere.push(`${esc}${query.table}${esc}.${esc}${key}${esc} IS NOT NULL `);
        } else if (_.isArray(value) && value.length === 0) {
          // where in empty array --> FALSE
          sqlwhere.push('TRUE ');
        } else if (_.isArray(value)) {
          sqlwhere.push(`${esc}${query.table}${esc}.${esc}${key}${esc} ${dialect.notin} (${dialect.param(i++)}) `);
          params.push(value);
        } else {
          sqlwhere.push(`${esc}${query.table}${esc}.${esc}${key}${esc} != ${dialect.param(i++)} `);
          params.push(value);
        }
      });
    });
    if (sqlwhere.length) {
      const ret = query.where.length > 0 ? 'AND ' : 'WHERE ';
      return ret + sqlwhere.join('AND ');
    }
    return '';
  };

  // INSERT SQL
  this.insertSQL = function() {

    // insert into
    let sql = `INSERT INTO ${esc}${query.table}${esc}`;

    // columns
    const columns = [], values = [], params = [];
    _.forEach(query.values, function(value, key) {
      columns.push(`${esc}${key}${esc}`);
      values.push(dialect.param(i++));
      params.push(value);
    });

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
  this.updateSQL = function() {

    // update set
    let sql = `UPDATE ${esc}${query.table}${esc} SET `;

    // columns
    const columns = [], params = [];
    _.forEach(query.values, function(value, key) {
      columns.push(`${esc}${key}${esc} = ${dialect.param(i++)}`);
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
  this.deleteSQL = function() {

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
  this.orderSQL = function() {

    if (!query.order || !query.order.length) {
      return '';
    }

    var sql = 'ORDER BY ' + query.order.join(', ') + ' ';

    return sql;
  };


  // GROUP BY SQL
  this.groupSQL = function() {
    if (_.isEmpty(query.group )) {
      return '';
    }

    var sql = 'GROUP BY ' + query.group.join(', ') + ' ';
    return sql;
  };
};

module.exports = Sql;
