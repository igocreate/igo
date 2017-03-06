

'use strict';

const _           = require('lodash');
const moment      = require('moment');
const AdminUtils  = require('./AdminUtils');

//
const value = function(object, attr, options, dateformat) {
  const v = object && object[attr];
  if (v === undefined || v === null) {
    return '';
  }
  if (_.isDate(v)) {
    return moment(v).format(dateformat || 'MMMM DD, YYYY HH:mm:ss');
  } else if (_.isObject(v)) {
    let name = v.name || '#' + v.id;
    if (_.isFunction(name)) {
      name = v.name();
    };
    const path = options.adminpath
        + '/' + AdminUtils.pluralize(v.constructor.name).toLowerCase()
        + '/' + v.id;
    return '<a href="' + path + '">' + name + '</a>';
  };
  return v;
};

//
module.exports.title = function(title) {
  return '<h1>' + title + '</h1>';
};

//
module.exports.subtitle = function(title) {
  return '<h3>' + title + '</h3>';
}

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
  var html = '<div class="float-right admin-actions">';
  buttons.forEach(function(button) {
    html += '<a href="' + button.url + '" class="btn btn-' + (button.button || 'secondary') + ' ml-1">' + button.name + '</a>';
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
  objects = objects || [];
  objects.forEach(function(object) {
    var objpath = [ options.adminpath, options.plural, object.id ].join('/');
    html += '<tr>';
    html += '<td><a href="' + objpath + '">#' + object.id + '</a></td>'
    fields.forEach(function(field) {
      html += '<td>' + value(object, field, options) + '<td>';
    });
    html += '<td class="actions">';
    html += '<a href="' + objpath + '">View</a>';
    html += '&nbsp;<a href="' + objpath + '/edit">Edit</a>';
    _.forEach(options.actions, function(action, key)  {
      if (action.condition === undefined || action.condition(object)) {
        html += '&nbsp;<a href="' + objpath + '/' + key + '">' + action.name + '</a>';
      }
    });
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
    html += '<td class="value">' + value(object, field, options) + '</td><tr>';
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

  let html = '<div class="row"><div class="col-sm-8 offset-sm-2">';
  html += '<form action="' + options.adminpath + action + '" method="POST">';

  fields.forEach(function(fieldInfo) {
    const field = fieldInfo[0];
    const type  = fieldInfo[1];

    html += '<div class="form-group row">';
    html += '<label for="' + field + '"  class="col-sm-4 col-form-label" >' + field + '</label>';
    html += '<div class="col-sm-8">'
    if (type === 'hidden') {
      html += '<p class="form-control-static">' + value(object, field, options) + '</p>';
      html += '<input type="hidden" name="id" value="' + value(object, field, options) + '" />';
    } else if (type === 'static') {
      html += '<p class="form-control-static">' + value(object, field, options) + '</p>';
    } else if (type === 'number') {
      html += '<input type="number" class="form-control" id="' + field + '" name="' + field + '" placeholder="' + field + '" value="' + value(object, field, options) + '" />';
    } else if (type === 'textarea') {
      html += '<textarea class="form-control form-textarea" id="' + field + '" name="' + field + '" rows="5" placeholder="' + field + '">' + value(object, field, options) + '</textarea>';
    } else if (type === 'datetime') {
      html += '<input type="text" class="form-control datetimepicker" id="' + field + '" name="' + field + '" placeholder="' + field + '" value="' + value(object, field, options, 'YYYY-MM-DD HH:mm:ss') + '" />';
    } else if (type === 'date') {
      html += '<input type="text" class="form-control datepicker" id="' + field + '" name="' + field + '" placeholder="' + field + '" value="' + value(object, field, options, 'YYYY-MM-DD') + '" />';
    } else if (type === 'time') {
      html += '<input type="text" class="form-control timepicker" id="' + field + '" name="' + field + '" placeholder="' + field + '" value="' + value(object, field, options, 'HH:mm:ss') + '" />';
    } else if (type === 'checkbox') {
      html += '<div class="form-check"><label class="form-check-label">';
      html += '<input class="form-check-input" type="checkbox" id="' + field + '" name="' + field + '" ';
      if (object && object[field]) {
        html += 'checked ';
      }
      html += 'value="1" > ';
      html += '</label></div>';
    } else {
      html += '<input type="text" class="form-control" id="' + field + '" name="' + field + '" placeholder="' + field + '" value="' + value(object, field, options) + '" />';
    }
    html += '</div></div>';
  });
  // buttons
  html += '<div class="form-group row admin-form-buttons">';
  html += '<div class="offset-sm-4 col-sm-8">';
  html += '<input type="submit" class="btn btn-primary" value="' + submit + '"/>';
  html += '<div></div>';
  html += '</form></div></div>';

  return html;
};
