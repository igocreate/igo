'use strict';

var async   = require('async');
var _       = require('lodash');
var winston = require('winston');


//
var Sql = function(query) {

  // SELECT SQL
  this.selectSQL = function() {
    // select
    var sql = 'SELECT * ';
    var params = [];

    // from
    sql += 'FROM `' + query.table + '` ';

    // where
    sql += this.whereSQL(params);

    // limit
    if (query.limit) {
      sql += 'LIMIT 0, ? ';
      params.push(query.limit);
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
    _.forEach(query.where, function(where) {
      if (_.isArray(where)) {
        sqlwhere.push(where[0] + ' ');
        _.toArray(where[1]).forEach(function(param) {
          params.push(param);
        });
      } else if (_.isString(where)) {
        sqlwhere.push(where + ' ');
      } else {
        _.forEach(where, function(value, key) {
          if (value === null) {
            sqlwhere.push('`' + key + '` IS NULL ');
          } else if (_.isArray(value)) {
            sqlwhere.push('`' + key + '` IN (?) ');
            params.push(value);
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
    var sql = 'INSERT INTO `' + query.table + '`';

    // columns
    var columns = [], values = [], params = [];
    _.forEach(query.values, function(value, key) {
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
    var sql = 'UPDATE `' + query.table + '` SET ';

    // columns
    var columns = [], values = [], params = [];
    _.forEach(query.values, function(value, key) {
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
    var sql = 'DELETE FROM `' + query.table + '` ';

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
