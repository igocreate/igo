

'use strict';

var _ = require('lodash');


//
module.exports.index = function(config, objects) {

  var html = module.exports.breadcrumb(config, [
    [ '/' + config.plural, config.Plural]
  ]);
  html += '<h1>' + _.capitalize(config.Plural) + '</h1>';
  html += module.exports.table(config.fields, objects);
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
module.exports.table = function(fields, objects) {
  var html = '<div class="table-responsive">';
  html += '<table class="table table-sm table-hover">';
  // thead
  html += '<thead><tr>';
  fields.forEach(function(field) {
    html += '<th>' + field + '<th>';
  });
  html += '</tr></thead>';

  // tbody
  objects.forEach(function(obj) {
    html += '<tr>';
    fields.forEach(function(field) {
      html += '<td>' + obj[field] + '<td>';
    });
    html += '</tr>';
  })

  ;
  html += '</table></div>';

  return html;
};
