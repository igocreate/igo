
'use strict';

const _             = require('lodash');

const AdminUtils    = require('./AdminUtils');
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

    let fields = options.edit && options.edit.fields ||
        options.form && options.form.fields ||
        options.fields;
    fields = AdminUtils.defaultFields(fields);
    html += HtmlRenderer.form(fields, object, options);

    return html;
  };

  return function(req, res) {
    model.find(req.params.id, function(err, object) {
      if (!object) {
        return res.redirect(options.adminpath + '/' + options.plural);
      }
      if (options.edit.template) {
        res.locals[options.name] = object;
        return res.render(options.edit.template);
      }
      res.locals.html = renderHtml(object);
      res.render(options.template);
    });
  }
}
