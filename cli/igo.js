#!/usr/bin/env node


var argv = require('minimist')(process.argv.slice(2));
var args = argv._;

//
var actions = {
  create: require('./create.js'),
  db:     require('./db.js')
};

console.log('igo version: ' + require('../package.json').version);

if (args.length === 0 || !actions[args[0]]) {
  console.warn('Usage: igo <action> <options>');
  console.warn('Possible actions: ' + Object.keys(actions).join(', ') + '.');
  process.exit(1);
}

// invoke action
actions[args[0]](argv);
