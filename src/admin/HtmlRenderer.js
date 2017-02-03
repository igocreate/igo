

'use strict';

const _       = require('lodash');
const moment  = require('moment');

//
const value = function(v, form) {
  if (v === undefined || v === null) {
    return '';
  }
  if (_.isDate(v)) {
    const format = form ? null : 'MMMM DD, YYYY HH:mm:ss';
    return moment(v).format(format);
  }
  return v;
};

//
module.exports.title = function(title) {
  return '<h1>' + title + '</h1>';
};

//
module.exports.breadcrumb = function(items, options) {
  var html = '<ol class="breadcrumb">';
  html += '<li class="breadcrumb-item"><a href="' + options.adminpath + '">Admin</a></li>';
  items.forEach(function(item) {
    if (item.length === 1) {
      // active
      html += '<li class="breadcrumb-item active">';
      html += item[0];
      html += '</li>';
    } else {
      html += '<li class="breadcrumb-item">';
      html += '<a href="' + options.adminpath + item[0] + '">';
      html += item[1];
      html += '</a></li>';
    }
  });
  html += '</ol>';
  return html;
};

//
module.exports.buttons = function(buttons, options) {
  var html = '<div class="pull-right">';
  buttons.forEach(function(button) {
    html += '<a href="' + options.adminpath + button[0] + '" class="btn btn-primary">' + button[1] + '</a>';
  })
  html += '</div>';
  return html;
};

//
module.exports.table = function(objects, fields, options) {

  fields = _.reject(fields, function(el) { return el === 'id'; });

  var html = '<div class="table-responsive">';
  html += '<table class="table table-sm">';
  // thead
  html += '<thead><tr>';
  html += '<th>id</th>';
  fields.forEach(function(field) {
    html += '<th>' + field + '<th>';
  });
  html += '<th>Actions</th>';
  html += '</tr></thead>';

  // tbody
  objects.forEach(function(object) {
    var objpath = [ options.adminpath, options.plural, object.id ].join('/');
    html += '<tr>';
    html += '<td><a href="' + objpath + '">#' + object.id + '</a></td>'
    fields.forEach(function(field) {
      html += '<td>' + value(object[field]) + '<td>';
    });
    html += '<td class="actions">';
    html += '<a href="' + objpath + '">View</a>';
    html += '&nbsp;<a href="' + objpath + '/edit">Edit</a>';
    html += '</td></tr>';
  });
  html += '</table></div>';

  return html;
};

//
module.exports.details = function(object, fields, options) {
  let html = '<div class="table-responsive">';
  html    += '<table class="table table-sm">';
  fields.forEach(function(field) {
    html += '<tr><td class="field">' + field + '</td>';
    html += '<td class="value">' + value(object[field]) + '</td><tr>';
  });
  html += '</table></div>';
  return html;
};

//
module.exports.form = function(fields, object, options) {

  const create = !object || !object.id;
  const submit = create ? 'Create ' + options.Name : 'Update ' + options.Name;
  const action = create ?
    '/' + options.plural :
    '/' + options.plural + '/' + object.id;

  let html = '<form action="' + options.adminpath + action + '" method="POST">';
  html    += '<div class="table-responsive">';
  html    += '<table class="table table-sm">';
  fields.forEach(function(field) {
    html += '<tr>';
    html += '<td><label for="' + field + '"  class="col-sm-4 control-label" >' + field + '</label></td>';
    html += '<td>';
    if (field === 'id') {
      html += '<p class="form-control-static">' + object.id + '</p>';
      html += '<input type="hidden" name="id" value="' + object.id + '" />';
    } else {
      html += '<input type="text" class="form-control" id="' + field + '" name="' + field + '" placeholder="' + field + '" value="' + value(object && object[field], true) + '" />';
    }
    html += '</td></tr>';
  });
  // buttons
  html += '<tr>';
  html += '<td></td>';
  html += '<td>';
  html += '<input type="submit" class="btn btn-primary" value="' + submit + '"/>';
  html += '</td></tr>';
  html += '<table/></div></form>';

  return html;
};
