const path  = require('path');


process.env.NODE_ENV = 'test';

const config = require('../src/config');
config.init();

config.projectRoot = path.join(process.cwd(), '/test/project');

require('../src/dev/test/init');