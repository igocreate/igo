

const fs      = require('fs/promises');
const path    = require('path');

const _       = require('lodash');
const fse     = require('fs-extra');

const utils   = require('../src/utils');


// igo create
module.exports = async function (argv) {
  const args = argv._;
  if (args.length !== 2 && args.length !== 3) {
    console.warn('Usage: igo create <project-directory> [model]');
    process.exit(1);
  }
  
  const model = args.length === 3 ? args[2] : 'tailwind';
  
  const directory = './' + args[1];

  await fs.mkdir(directory)

  const options = {
    overwrite: false // do not overwrite
  };

  // recursive copy from skel to project directory
  await fse.copy(path.join(__dirname, '../skel', model), directory, options)

  const packagejson = require('../package.json');
  const replacements = {
    '{igo.version}':  packagejson.version,
    '{project.name}': args[1],
    '{RANDOM_1}':     utils.randomString(40),
    '{RANDOM_2}':     utils.randomString(40),
    '{RANDOM_3}':     utils.randomString(40)
  };

  const replaceInDirectory = async (dir) => {
    const files = await fs.readdir(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = await fs.lstat(fullPath);

      if (stat.isDirectory() && file !== 'node_modules') {
        await replaceInDirectory(fullPath);
      } else if (stat.isFile()) {
        let content = await fs.readFile(fullPath, 'utf8');
        let updated = false;

        _.forEach(replacements, (replacement, regexp) => {
          const regex = new RegExp(regexp, 'g');
          if (regex.test(content)) {
            content = content.replace(regex, replacement);
            updated = true;
          }
        });

        if (updated) {
          await fs.writeFile(fullPath, content, 'utf8');
        }
      }
    }
  };

  return await replaceInDirectory(directory);
};
