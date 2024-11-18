

const fs      = require('fs');
const path    = require('path');

const _       = require('lodash');
const fse     = require('fs-extra');

const utils   = require('../src/utils');


// igo create
module.exports = function(argv) {
  const args = argv._;
  if (args.length !== 2 && args.length !== 3) {
    console.warn('Usage: igo create <project-directory> [model]');
    process.exit(1);
  }
  
  const model = args.length === 3 ? args[2] : 'default';
  
  const directory = './' + args[1];
  fs.mkdir(directory, (err) => {
    if (err && err.code !== 'EEXIST') {
      console.error('mkdir error: ' + err);
      process.exit(1);
    }

    const options = {
      overwrite: false // do not overwrite
    };
    // recursive copy from skel to project directory
    console.log('create project in ' + directory);
    fse.copy(__dirname + '/../skel/' + model, directory, options, (err) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }

      // replace in files
      const packagejson = require('../package.json');
      const replacements = {
        '{igo.version}':  packagejson.version,
        '{project.name}': args[1],
        '{RANDOM_1}':     utils.randomString(40),
        '{RANDOM_2}':     utils.randomString(40),
        '{RANDOM_3}':     utils.randomString(40)
      };

      const replaceInDirectory = (dir) => {
        fs.readdirSync(dir).forEach((file) => {
          const fullPath = path.join(dir, file);
          if (fs.lstatSync(fullPath).isDirectory() && file !== 'node_modules') {
            replaceInDirectory(fullPath);
          } else if (fs.lstatSync(fullPath).isFile()) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let updated = false;

            _.forEach(replacements, (replacement, regexp) => {
              const regex = new RegExp(regexp, 'g');
              if (regex.test(content)) {
                content = content.replace(regex, replacement);
                updated = true;
              }
            });

            if (updated) {
              fs.writeFileSync(fullPath, content, 'utf8');
            }
          }
        });
      };

      replaceInDirectory(directory);

      console.log('done!');
    });
  });
};
