

const assert    = require('assert');

//
describe('dev/vite.config', function() {

  it('should return viteConfig object', function() {
    const viteConfig     = require('../../src/dev/vite.config');
    assert(viteConfig !== undefined);
    assert(viteConfig.build !== undefined);
    assert(viteConfig.server !== undefined);
  });

});
