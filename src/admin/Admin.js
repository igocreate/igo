
'use strict';

var _     = require('lodash');

var html  = require('./html');

module.exports.register = function(app, admin) {

  // default configuration
  const config = {
    fields:     admin.model.schema.columns,
    adminpath:  '/admin',
    template:   'admin/admin'
  };

  _.merge(config, admin);

  config.Name   =  _.capitalize(config.name);
  config.Plural =  _.capitalize(config.plural);

  // index
  app.get('/' + config.plural, function(req, res) {
    admin.model.list(function(err, objects) {
      res.locals.html = html.index(config, objects);
      res.render(config.template);
    });
  });

  // show
  app.get('/' + config.plural + '/:id', function(req, res) {
    admin.model.find(req.params.id, function(err, object) {
      res.locals.html = html.show(config, object);
      res.render(config.template);
    });
  });

};
