#!/usr/bin/env node

global.IGO_CLI = true;

const argv    = require('minimist')(process.argv.slice(2));
const args    = argv._;

const logger  = require('../src/logger');
logger.init();

//
const actions = {
  create:   require('./create.js'),
  db:       require('./db.js'),
  i18n:     require('./i18n.js'),
  compress: require('./compress.js'),
};

console.log('igo version: ' + require('../package.json').version);

if (args.length === 0 || !actions[args[0]]) {
  console.warn('Usage: igo <action> <options>');
  console.warn('Possible actions: ' + Object.keys(actions).join(', ') + '.');
  process.exit(1);
}

// invoke action
actions[args[0]](argv);
