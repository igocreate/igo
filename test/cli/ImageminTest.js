
require('../../src/dev/test/init');

const imagemin = require('../../cli/imagemin');

describe('cli/imagemin', function() {

  it('should run', () => {
    imagemin();
  });

});