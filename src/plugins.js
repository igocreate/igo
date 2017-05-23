

'use strict';

const _       = require('lodash');
const winston = require('winston');

let init    = false;


module.exports  = {
  list: []
};

module.exports.init = function() {

  if (init) {
    throw new Error('dont init plugins twice');
    return;
  }
  init = true;

  // load app plugins
  try {
    const plugins = require(process.cwd() + '/app/plugins');

    module.exports.list = _.values(plugins);
    module.exports.list.forEach(function(plugin) {
      // inject igo
      plugin.igo = require('../index');
    });

  } catch (err) {};

};
