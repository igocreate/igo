
'use strict';

const assert    = require('assert');
const _         = require('lodash');

//
describe('dev/webpack.config', function() {

  it('should return webpackConfig object', function() {
    var webpackConfig     = require('../../src/dev/webpack.config');
    assert(webpackConfig !== undefined);
  });

});
