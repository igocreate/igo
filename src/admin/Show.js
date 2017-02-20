'use strict';

const _             = require('lodash');

const HtmlRenderer  = require('./HtmlRenderer');
const AdminUtils    = require('./AdminUtils');


//
module.exports = function(model, options) {

  const renderHtml = function(object) {

    let title = options.Name + ' #' + object.id;

    let html = HtmlRenderer.breadcrumb([
      [ '/' + options.plural, options.Plural],
      [ title ]
    ], options);

    options.actions = _.map(options.actions, function(value, key) {
      return {
        url:  options.adminpath + '/' + options.plural + '/' + object.id + '/' + key,
        name: value.name,
      };
    });
    html += HtmlRenderer.buttons(_.concat(options.actions || [], {
      url:    options.adminpath + '/' + options.plural + '/' + object.id + '/edit',
      name:   'Edit ' + options.Name,
    }), options);

    html += HtmlRenderer.title(title);

    let fields = options.show.fields || options.fields;
    html += HtmlRenderer.details(object, fields, options);

    // Associations
    _.forEach(options.show.associations, function(association_options, key) {
      var association = _.find(model.schema.associations, a => a[1] === key );

      var fields = association_options.fields || association[2].schema.columns;

      const suboptions = {
        adminpath: options.adminpath,
        actions:   association_options.actions || [],
        Plural:    AdminUtils.pluralize(association[2].name),
        plural:    AdminUtils.pluralize(association[2].name.toLowerCase())
      }

      if (association[0] === 'has_many') {
        html += HtmlRenderer.subtitle(suboptions.Plural);
        html += HtmlRenderer.table(object[association[1]], fields, suboptions);
      } else {
        html += HtmlRenderer.subtitle(association[2].name);
        html+= HtmlRenderer.details(object[association[1]], fields, suboptions);
      }
    });

    return html;
  };

  return function(req, res) {
    model.includes(_.keys(options.show.associations)).find(req.params.id, function(err, object) {
      res.locals.html = renderHtml(object);
      res.render(options.template);
    });
  }
}
