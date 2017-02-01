
'use strict';

const _             = require('lodash');

const HtmlRenderer  = require('./HtmlRenderer');


//
module.exports = function(model, options) {

  const renderHtml = function(object) {

    let title = 'Edit ' + options.Name;

    let html = HtmlRenderer.breadcrumb([
      [ '/' + options.plural, options.Plural],
      [ '/' + options.plural + '/' + object.id, options.Name + ' #' + object.id],
      [ title ]
    ], options);

    html += HtmlRenderer.title(title);

    let fields = options.new.fields || options.fields;
    html += HtmlRenderer.form(fields, object, options);

    return html;
  };

  return function(req, res) {
    model.find(req.params.id, function(err, object) {
      res.locals.html = renderHtml(object);
      res.render(options.template);
    });
  }
}
