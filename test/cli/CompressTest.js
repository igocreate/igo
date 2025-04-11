
require('../../src/dev/test/init');

const fs        = require('fs');

const compress  = require('../../cli/compress');

describe('cli/compress', function () {

  it('should run', async () => {
    // create ./public directory if not exists
    if (!fs.existsSync('./public')) {
      fs.mkdirSync('./public');
    }
    await compress();
  });

});