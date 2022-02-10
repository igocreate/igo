
process.env.NODE_ENV = 'test';
const config = require('../src/config');
config.init();

config.projectRoot 	= process.cwd() + '/test/project';
config.viewsRoot 	= process.cwd() + '/test/project/views';

require('../src/dev/test/init');