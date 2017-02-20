
'use strict';

const HtmlRenderer = require('./HtmlRenderer');

//
module.exports = function(model, options) {

  // render
  const renderHtml = function(objects) {

    let html = HtmlRenderer.breadcrumb([
      [ options.Plural]
    ], options);

    html += HtmlRenderer.buttons([{
      url:    options.adminpath + '/' + options.plural + '/new',
      name:   'New ' + options.Name,
    }], options);

    html += HtmlRenderer.title(options.Plural);

    let fields = options.index.fields || options.fields;
    html += HtmlRenderer.table(objects, fields, options);
    return html;
  }

  //
  return function(req, res) {
    model.list(function(err, objects) {
      res.locals.html = renderHtml(objects);
      res.render(options.template);
    });
  }
};
