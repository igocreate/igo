

var fs      = require('fs');
var fse     = require('fs-extra');

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
      console.log('done!');
    });

  });
};
