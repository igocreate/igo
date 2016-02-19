'use strict';

var requireDir  = require('require-dir');

//
module.exports.init = function(app) {
  var routes      = require(process.cwd() + '/app/routes');
  var controllers = requireDir(process.cwd() + '/app/controllers');
  routes.init(app, controllers);
};
