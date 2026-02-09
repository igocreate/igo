

const assert    = require('assert');

//
describe('dev/webpack.config', function() {

  it('should return webpackConfig object', function() {
    const webpackConfig     = require('@igojs/server').dev.webpackConfig;
    assert(webpackConfig !== undefined);
    assert(webpackConfig.entry !== undefined);
    assert(webpackConfig.output !== undefined);
  });

});
