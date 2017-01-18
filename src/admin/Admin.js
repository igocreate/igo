
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

  _.defaultsDeep(config, admin);

  config.Plural =  _.capitalize(config.plural);

  // index
  app.get(config.adminpath + '/' + config.plural, function(req, res) {
    admin.model.list(function(err, objects) {
      res.locals.html = html.index(config, objects);
      res.render(config.template);
    });
  });

};
