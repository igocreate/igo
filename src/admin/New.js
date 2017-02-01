
'use strict';

const _             = require('lodash');

const HtmlRenderer  = require('./HtmlRenderer');


//
module.exports = function(model, options) {

  const renderHtml = function(object) {

    let title = 'New ' + options.Name;

    let html = HtmlRenderer.breadcrumb([
      [ '/' + options.plural, options.Plural],
      [ title ]
    ], options);

    html += HtmlRenderer.title(title);

    let fields = options.new.fields || options.fields;
    fields = _.pull(fields, 'id');
    html += HtmlRenderer.form(fields, object, options);

    return html;
  };

  return function(req, res) {
    res.locals.html = renderHtml(req.flash(options.name));
    res.render(options.template);
  }
}
