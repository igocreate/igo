const path  = require('path');


process.env.NODE_ENV = 'test';

const config = require('@igojs/server').config;
config.init();

config.projectRoot = path.join(__dirname, 'project');

require('@igojs/server').dev.test();
