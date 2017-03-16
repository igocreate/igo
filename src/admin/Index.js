
'use strict';

const _             = require('lodash');
const HtmlRenderer  = require('./HtmlRenderer');

//
module.exports = function(model, options) {

  if (_.isFunction(options.index)) {
    return options.index;
  }

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
    const associations = _.chain(model.schema.associations)
      .filter(function(association) {
        return association[0] === 'belongs_to';
      }).map(function(association) {
        return association[1];
      }).value();
    model.includes(associations).list(function(err, objects) {
      if (options.index.template) {
        res.locals[options.plural] = objects;
        return res.render(options.index.template);
      }
      res.locals.html = renderHtml(objects);
      res.render(options.template);
    });
  }
};
