
'use strict';


const HtmlRenderer = require('./HtmlRenderer');


//
module.exports = function(model, options) {

  const renderHtml = function(object) {

    let title = options.Name + ' #' + object.id;

    let html = HtmlRenderer.breadcrumb([
      [ '/' + options.plural, options.Plural],
      [ title ]
    ], options);

    html += HtmlRenderer.buttons([
      [ '/' + options.plural + '/' + object.id + '/edit', 'Edit ' + options.Name ]
    ], options);

    html += HtmlRenderer.title(title);

    let fields = options.show.fields || options.fields;
    html += HtmlRenderer.details(object, fields, options);

    return html;
  };

  return function(req, res) {
    model.find(req.params.id, function(err, object) {
      res.locals.html = renderHtml(object);
      res.render(options.template);
    });
  }
}
