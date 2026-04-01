
const _       = require('lodash');
const { compileCondition, compileNotCondition } = require('./OperatorCompiler');

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
        const [_assoc_type, name, Obj] = join.association;
        select_sql = select_sql.replace(new RegExp(`\\b${Obj.schema.table}\\b`, 'g'), name);
      });
      sql += select_sql + ' ';
    } else {
      sql += `${esc}${query.table}${esc}.*`;

      _.each(query.joins, join => {
        const { src_schema: _src_schema, association } = join;
        const [ _assoc_type, name, Obj, _src_column, _column] = association;
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
    sql += this.addJoins(params);

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
    sql += this.addJoins(params);

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
  addJoins(params) {
    const { query, dialect } = this;
    const { esc }   = dialect;

    let sql = '';
    _.each(query.joins, join => {
      const { src_schema, type, association, src_alias } = join;
      const [ , name, Obj, src_column, column, extraWhere] = association;
      const src_table_alias = src_alias || src_schema.table;
      const table       = Obj.schema.table;
      let joinSql = `${type.toUpperCase()} JOIN ${esc}${table}${esc} AS ${esc}${name}${esc} ON ${esc}${name}${esc}.${esc}${column}${esc} = ${esc}${src_table_alias}${esc}.${esc}${src_column}${esc}`;
      if (extraWhere) {
        _.forOwn(extraWhere, (value, key) => {
          joinSql += ` AND ${esc}${name}${esc}.${esc}${key}${esc} = ${dialect.param(this.i++)}`;
          params.push(value);
        });
      }
      sql += joinSql + ' ';
    });
    return sql;
  }

  // WHERE
  whereSQL(params, not) {
    const { query, dialect } = this;
    const { esc: _esc } = dialect;

    const sqlwhere = [];
    const wheres = not ? query.whereNot : query.where;
    _.forEach(wheres, (where) => {
      if (_.isArray(where)) {
        // where is an array with sql string and params
        if (not) {
          console.warn('Where clause contains a string with whereNot, this is not supported');
          return;
        }
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
        // where is an object — may contain operators ($and, $or, $like, etc.)
        this._compileWhereObject(where, params, sqlwhere, not);
      }
    });

    if (sqlwhere.length) {
      const ret = (not && query.where.length > 0) ? 'AND ' : 'WHERE ';
      return ret + sqlwhere.join('AND ');
    }
    return '';
  };

  // Compile un objet where en fragments SQL
  _compileWhereObject(where, params, sqlwhere, not) {
    const { query, dialect } = this;
    const { esc } = dialect;

    // $and : AND explicite entre sous-expressions
    if (where.$and && _.isArray(where.$and)) {
      const parts = [];
      _.forEach(where.$and, (child) => {
        const subParts = [];
        this._compileWhereObject(child, params, subParts, not);
        if (subParts.length > 1) {
          parts.push('(' + subParts.join('AND ').trim() + ')');
        } else if (subParts.length === 1) {
          parts.push(subParts[0].trim());
        }
      });
      // Traiter les clés siblings (hors $and)
      const siblings = _.omit(where, '$and');
      if (!_.isEmpty(siblings)) {
        const subParts = [];
        this._compileWhereObject(siblings, params, subParts, not);
        if (subParts.length > 0) {
          parts.push(subParts.join('AND ').trim());
        }
      }
      if (parts.length === 1) {
        sqlwhere.push(parts[0] + ' ');
      } else if (parts.length > 1) {
        sqlwhere.push(`(${parts.join(' AND ')}) `);
      }
      return;
    }

    // $or : OR explicite entre sous-expressions
    if (where.$or && _.isArray(where.$or)) {
      const orParts = [];
      _.forEach(where.$or, (child) => {
        const subParts = [];
        this._compileWhereObject(child, params, subParts, not);
        if (subParts.length > 1) {
          orParts.push('(' + subParts.join('AND ').trim() + ')');
        } else if (subParts.length === 1) {
          orParts.push(subParts[0].trim());
        }
      });
      if (orParts.length === 1) {
        sqlwhere.push(orParts[0] + ' ');
      } else if (orParts.length > 1) {
        sqlwhere.push(`(${orParts.join(' OR ')}) `);
      }
      // Traiter les clés siblings (hors $or)
      const siblings = _.omit(where, '$or');
      if (!_.isEmpty(siblings)) {
        this._compileWhereObject(siblings, params, sqlwhere, not);
      }
      return;
    }

    // Clés simples : colonnes avec valeurs (scalaires ou opérateurs)
    _.forOwn(where, (value, key) => {
      // Résoudre l'alias de colonne
      let columnAlias;
      if (key.indexOf('.') > -1 && key.indexOf(esc) === -1) {
        columnAlias = _.map(key.split('.'), (part) => (`${esc}${part}${esc}`)).join('.');
      } else {
        columnAlias = `${esc}${query.table}${esc}.${esc}${key}${esc}`;
      }

      const compiler = not ? compileNotCondition : compileCondition;
      const result = compiler(columnAlias, value, dialect, this.i);
      this.i = result.i;
      sqlwhere.push(result.sql + ' ');
      params.push(...result.params);
    });
  }

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
