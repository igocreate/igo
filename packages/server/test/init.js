const path  = require('path');


process.env.NODE_ENV = 'test';

const config = require('@igo/server').config;
config.init();

config.projectRoot = path.join(__dirname, 'project');

require('@igo/server').dev.test();
