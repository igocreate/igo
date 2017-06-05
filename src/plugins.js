

'use strict';

const _       = require('lodash');
const winston = require('winston');



//
module.exports.list = []

//
module.exports.init = function() {

  const igo = require('../index');

  // load app plugins
  try {
    const plugins = require(process.cwd() + '/app/plugins');
    plugins.forEach(function(plugin) {
      // init with igo
      plugin.init(igo);
    });
    module.exports.list = plugins;
  } catch (err) {
    console.log(err);
  };

};
