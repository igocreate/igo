

const assert    = require('assert');

//
describe('dev/vite.config', function() {

  it('should return viteConfig object', function() {
    const viteConfig     = require('@igo/server').dev.viteConfig;
    assert(viteConfig !== undefined);
    assert(viteConfig.build !== undefined);
    assert(viteConfig.server !== undefined);
  });

});
