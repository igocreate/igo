
require('../../src/dev/test/init');

const compress = require('../../cli/compress');

describe('cli/compress', function() {

  it('should run', () => {
    compress();
  });

});