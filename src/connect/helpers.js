'use strict';

var moment      = require('moment');
var dust        = require('dustjs-linkedin');
var dustHelpers = require('dustjs-helpers');


module.exports = function(req, res, next) {

  res.locals.lang    = req.locale;
  res.locals.session = req.session;

  res.locals.t = function(chunk, context, bodies, params) {
    var key         = dust.helpers.tap(params.key, chunk, context);
    var translation = req.t(key);
    return chunk.write(translation);
  };
  next();
};

//
dust.helpers.nl2br = function(chunk, context, bodies, params) {
  var val;
  val = dust.helpers.tap(params.value, chunk, context);
  if (val) {
    val = val.replace(/\n/g, '<br/>');
    chunk.write(val);
  }
  return chunk;
};

//
dust.helpers.removenl = function(chunk, context, bodies, params) {
  var val;
  val = dust.helpers.tap(params.value, chunk, context);
  if (val) {
    val = val.replace(/\n/g, ' ');
    val = val.replace(/\r/g, '');
    chunk.write(val);
  }
  return chunk;
};

//
dust.helpers.dateformat = function(chunk, context, bodies, params) {
  var val = dust.helpers.tap(params.date, chunk, context);
  if (!val) return chunk;

  if (params.lang) {
    var locale = dust.helpers.tap(params.lang, chunk, context);
    moment.locale(locale);
  }

  var m = moment(val);
  if (m !== null && m.isValid()) {
    if (params.format === 'calendar') {
      chunk.write(m.calendar());
    } else {
      chunk.write(m.format(params.format || 'YYYY-MM-DD HH:mm:ss'));
    }
  }
  return chunk;
};

//
dust.helpers.length = function(chunk, context, bodies, params) {
  var arr;
  arr = dust.helpers.tap(params.array, chunk, context);
  if (arr) {
    chunk.write(arr.length);
  } else {
    chunk.write('0');
  }
  return chunk;
};
