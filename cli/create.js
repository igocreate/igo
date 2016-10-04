
'use strict';

var fs      = require('fs');

var _       = require('lodash');
var fse     = require('fs-extra');
var replace = require('replace');


// igo create
module.exports = function(argv) {
  var args = argv._;

  if (args.length !== 2) {
    console.warn('Usage: igo create <project-directory>')
    process.exit(1);
  }

  var directory = './' + args[1];
  fs.mkdir(directory, function(err, dir) {
    if (err && err.code !== 'EEXIST') {
      console.error('mkdir error: ' + err);
      process.exit(1);
    }

    var options = {
      clobber: false // do not overwrite
    };
    // recursive copy from skel to project directory
    fse.copy(__dirname + '/../skel', directory, options, function (err) {
      if (err) {
        console.error(err);
        process.exit(1);
      }

      // replace in files
      var replacements = {
        '\{igo.version\}':    require('../package.json').version,
        '\{project.name\}':   args[1]
      }
      _.forEach(replacements, function(replacement, regex) {
        replace({
          regex:        regex,
          replacement:  replacement,
          paths:        [ directory ],
          exclude:      'node_modules',
          recursive:    true,
          silent:       true
        });
      });
      console.log('done!');
    });
  });
};
