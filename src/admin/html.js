

'use strict';

var _ = require('lodash');


var value = function(v) {
  return (v === undefined || v === null) ? '' : v;
  return v;
};

//
module.exports.index = function(config, objects) {
  var html = module.exports.breadcrumb(config, [
    [ '/' + config.plural, config.Plural]
  ]);
  html += '<h1>' + _.capitalize(config.Plural) + '</h1>';
  html += module.exports.table(config.fields, objects, config.adminpath + '/' + config.plural);
  return html;
};

//
module.exports.show = function(config, object) {
  var title = _.capitalize(config.Name) + ' #' + object.id;

  var html = module.exports.breadcrumb(config, [
    [ '/' + config.plural, config.Plural],
    [ '/' + config.plural + '/' + object.id, title]
  ]);

  html += '<h1>' + title + '</h1>';
  html += '<div class="table-responsive">';
  html += '<table class="table table-sm table-striped">';
  config.fields.forEach(function(field) {
    html += '<tr><td>' + field + '</td><td>' + value(object[field]) + '</td><tr>';
  });
  html += '</table></div>';

  return html;
};

//
module.exports.breadcrumb = function(config, lis) {
  var html = '<ol class="breadcrumb">';
  html += '<li class="breadcrumb-item"><a href="' + config.adminpath + '">Admin</a></li>';
  lis.forEach(function(li) {
    html += '<li class="breadcrumb-item">';
    html += '<a href="' + config.adminpath + li[0] + '">';
    html += li[1];
    html += '</a></li>';
  });
  html += '</ol>';
  return html;
};

//
module.exports.table = function(fields, objects, path) {

  fields = _.reject(fields, function(el) { return el === 'id'; });

  var html = '<div class="table-responsive">';
  html += '<table class="table table-sm table-striped">';
  // thead
  html += '<thead><tr>';
  html += '<th>id</th>';
  fields.forEach(function(field) {
    html += '<th>' + field + '<th>';
  });
  html += '<th>Actions</th>';
  html += '</tr></thead>';

  // tbody
  objects.forEach(function(obj) {
    var objpath = [ path, obj.id ].join('/');
    html += '<tr>';
    html += '<td><a href="' + objpath + '">#' + obj.id + '</a></td>'
    fields.forEach(function(field) {
      html += '<td>' + value(obj[field]) + '<td>';
    });
    html += '<td><a href="' + objpath + '">Voir</a></td>'
    html += '</tr>';
  });
  html += '</table></div>';

  return html;
};
