const config = require('./config');
//
module.exports.list = [];

//
module.exports.init = function() {

  const igo = require('../index');

  // load app plugins
  try {
    const plugins = require(config.projectRoot + '/app/plugins');
    plugins.forEach(function (plugin) {
      // init with igo
      plugin.init(igo);
    });
    module.exports.list = plugins;
  } catch (err) {
    console.log(err);
  }

};
