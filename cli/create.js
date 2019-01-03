

const fs      = require('fs');

const _       = require('lodash');
const fse     = require('fs-extra');
const replace = require('replace-in-file');


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
      overwrite: false // do not overwrite
    };
    // recursive copy from skel to project directory
    console.log('create project in ' + directory);
    fse.copy(__dirname + '/../skel', directory, options, function (err) {
      if (err) {
        console.error(err);
        process.exit(1);
      }

      // replace in files
      var packagejson = require('../package.json');
      var replacements = {
        '\{igo.version\}':      packagejson.version,
        '\{project.name\}':     args[1]
      }
      _.forEach(replacements, function(replacement, regexp) {
        const changed = replace.sync({
          files:      directory + '/**/*',
          from:       new RegExp(regexp, 'g'),
          to:         replacement,
          ignore:     directory + '/node_modules/**/*'
        });
      });

      console.log('done!');
    });
  });
};
