

'use strict';

const _       = require('lodash');
const winston = require('winston');

module.exports  = {
  list: []
};

module.exports.init = function() {

  // load app plugins
  try {
    const plugins = require(process.cwd() + '/app/plugins');

    module.exports.list = plugins;
    module.exports.list.forEach(function(plugin) {
      // inject igo
      plugin.igo = require('../index');
    });

  } catch (err) {};

};
