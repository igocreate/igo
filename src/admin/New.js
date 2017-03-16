
'use strict';

const _             = require('lodash');

const AdminUtils    = require('./AdminUtils');
const HtmlRenderer  = require('./HtmlRenderer');


//
module.exports = function(model, options) {

  if (_.isFunction(options.new)) {
    return options.new;
  }

  const renderHtml = function(object) {

    let title = 'New ' + options.Name;

    let html = HtmlRenderer.breadcrumb([
      [ '/' + options.plural, options.Plural],
      [ title ]
    ], options);

    html += HtmlRenderer.title(title);

    let fields = options.new && options.new.fields ||
        options.form && options.form.fields ||
        AdminUtils.defaultFields(options.fields);
    // remove static fields
    fields = _.filter(fields, function(field) {
      return field[1] !== 'static';
    });
    html += HtmlRenderer.form(fields, object, options);

    return html;
  };

  return function(req, res) {
    if (options.new.template) {
      return res.render(options.new.template);
    }
    res.locals.html = renderHtml(req.flash(options.name));
    res.render(options.template);
  }
}
