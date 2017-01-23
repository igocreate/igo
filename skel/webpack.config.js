

//
const webpackConfig = require('igo').dev.webpackConfig;

webpackConfig.entry = {
  main:       './js/main.js',
  vendor:     './js/vendor.js',
  styles:     './scss/styles.scss'
}

module.exports = webpackConfig;
