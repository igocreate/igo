

'use strict'

const config  = require('../src/config');
const db      = require('../src/db/db');

// db verbs
const verbs   = {

  // igo db migrate
  migrate: function(args, callback) {
    db.migrate(callback);
  }

};

// igo db
module.exports = function(argv) {
  var args = argv._;
  config.init();
  db.init();

  if (args.length > 1 && verbs[args[1]]) {
    return verbs[args[1]](args, function() {
      console.log('Done.');
      process.exit(0);
    })
  }

  console.error('ERROR: Wrong options');
  console.error('Usage: igo db [migrate]')

};
