'use strict';

var db  = require('./db');
var _   = require('lodash');

//
var Sql = function(Instance) {
  this.query = {
    verb: 'select',
    where: []
  };

  // INSERT
  this.insert = function(table) {
    this.query.verb   = 'insert';
    this.query.table  = table;
    return this;
  };

  // UPDATE
  this.update = function(table) {
    this.query.verb   = 'update';
    this.query.table  = table;
    return this;
  };

  // DELETE
  this.delete = function(table) {
    this.query.verb   = 'delete';
    this.query.table  = table;
    return this;
  };

  // FROM
  this.from = function(table) {
    this.query.table = table;
    return this;
  };

  // WHERE
  this.where = function(where, params) {
    where = params ? [where, params] : where;
    this.query.where.push(where);
    return this;
  };

  // VALUES
  this.values = function(values) {
    this.query.values = _.pickBy(values, function(value) {
      // skip instance functions
      return typeof value !== 'function';
    });
    return this;
  };

  // FIRST
  this.first = function(callback) {
    this.query.limit = 1;
    this.execute(callback);
    return this;
  };

  // list
  this.list = function(callback) {
    this.execute(callback);
    return this;
  };

  //
  this.execute = function(callback) {
    var self  = this;
    var query = this.toSQL();
    db.query(query.sql, query.params, function(err, rows) {
      if (err) {
        winston.error(err);
        return callback(err);
      }
      if (rows && rows.length && self.query.limit === 1) {
        rows = new Instance(rows[0]);
      } else if (self.query.verb === 'select') {
        rows = rows.map(function(row) {
          return new Instance(row);
        });
      }
      callback(err, rows);
    });
  };

  // generate SQL
  this.toSQL = function() {
    var params = [];
    return this[this.query.verb + 'SQL']();
  };

  // SELECT SQL
  this.selectSQL = function() {
    // select
    var sql = 'SELECT * ';
    var params = [];

    // from
    sql += 'FROM `' + this.query.table + '` ';

    // where
    sql += this.whereSQL(params);

    // limit
    if (this.query.limit) {
      sql += 'LIMIT 0, ? ';
      params.push(this.query.limit);
    }

    var ret = {
      sql: sql,
      params: params
    };
    // console.dir(ret);
    return ret;
  };

  //
  this.whereSQL = function(params) {
    var sqlwhere = [];
    _.forEach(this.query.where, function(where) {
      if (_.isArray(where)) {
        sqlwhere.push(where[0] + ' ');
        _.merge(params, _.toArray(where[1]));
      } else if (_.isString(where)) {
        sqlwhere.push(where + ' ');
      } else {
        _.forEach(where, function(value, key) {
          if (value === null) {
            sqlwhere.push('`' + key + '` IS NULL ');
          } else {
            sqlwhere.push('`' + key + '`=? ');
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

  // INSERT SQL
  this.insertSQL = function() {

    // insert into
    var sql = 'INSERT INTO `' + this.query.table + '`';

    // columns
    var columns = [], values = [], params = [];
    _.forEach(this.query.values, function(value, key) {
      columns.push('`' + key + '`');
      values.push('?');
      params.push(value);
    });

    sql += '(' + columns.join(',') + ') ';
    sql += 'VALUES(' + values.join(',') + ')';

    var ret = {
      sql: sql,
      params: params
    };
    // console.dir(ret);
    return ret;
  };

  // UPDATE SQL
  this.updateSQL = function() {

    // update set
    var sql = 'UPDATE `' + this.query.table + '` SET ';

    // columns
    var columns = [], values = [], params = [];
    _.forEach(this.query.values, function(value, key) {
      columns.push('`' + key + '`=?');
      params.push(value);
    });

    sql += columns.join(', ') + ' ';

    sql += this.whereSQL(params);

    var ret = {
      sql: sql,
      params: params
    };
    return ret;
  };

  // DELETE SQL
  this.deleteSQL = function() {

    // delete
    var sql = 'DELETE FROM `' + this.query.table + '` ';

    // columns
    var params = [];
    sql += this.whereSQL(params);

    var ret = {
      sql: sql,
      params: params
    };
    return ret;
  };

};

module.exports = Sql;
