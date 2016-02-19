'use strict';

var db  = require('./db');
var _   = require('lodash');

//
var Sql = function() {
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

  // FROM
  this.from = function(table) {
    this.query.table = table;
    return this;
  };

  // WHERE
  this.where = function(where) {
    this.query.where.push(where);
    return this;
  };

  // VALUES
  this.values = function(values) {
    this.query.values = values;
    return this;
  };

  // FIRST
  this.first = function(callback) {
    this.query.limit = 1;
    this.execute(callback);
    return this;
  };

  //
  this.execute = function(callback) {
    var self  = this;
    var query = this.toSQL();
    db.query(query.sql, query.params, function(err, rows) {
      if (rows && rows.length && self.query.limit === 1) {
        callback(err, rows[0]);
      } else {
        callback(err, rows);
      }
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
    var sqlwhere = [];
    _.forEach(this.query.where, function(where) {
      _.forEach(where, function(value, key) {
        if (value === null) {
          sqlwhere.push('`' + key + '` IS NULL ');
        } else {
          sqlwhere.push('`' + key + '`=? ');
          params.push(value);
        }
      });
    });
    if (sqlwhere.length) {
      sql += 'WHERE ' + sqlwhere.join(' AND ');
    }

    // limit
    if (this.query.limit) {
      sql += 'LIMIT 0, ? ';
      params.push(this.query.limit);
    }

    var ret = {
      sql: sql,
      params: params
    };
    //console.dir(ret);
    return ret;
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

};

module.exports = Sql;
