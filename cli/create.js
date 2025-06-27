

const fs      = require('fs/promises');
const path    = require('path');

const _       = require('lodash');
const fse     = require('fs-extra');

const utils   = require('../src/utils');

// rename files starting with _. to . in the project directory
const renameUnderscoreFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await renameUnderscoreFiles(srcPath); // récursif
    } else if (entry.name.startsWith('_.')) {
      const newName = '.' + entry.name.slice(2);
      const destPath = path.join(dir, newName);
      await fse.move(srcPath, destPath, { overwrite: true });
    }
  }
}

// replace all occurrences of a regexp in files in a directory
const replaceInDirectory = async (dir, replacements) => {
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

// igo create
module.exports = async function (argv) {
  const args = argv._;
  if (args.length !== 2 && args.length !== 3) {
    console.warn('Usage: igo create <project-directory> [model]');
    process.exit(1);
  }
  
  const directory = './' + args[1];
  const model     = args.length === 3 ? args[2] : 'tailwind';

  await fs.mkdir(directory)

  // recursive copy from skel to project directory
  await fse.copy(path.join(__dirname, '../skel', model), directory, { overwrite: false })

  await renameUnderscoreFiles(directory);

  const packagejson = require('../package.json');
  const replacements = {
    '{igo.version}':  packagejson.version,
    '{project.name}': args[1],
    '{RANDOM_1}':     utils.randomString(40),
    '{RANDOM_2}':     utils.randomString(40),
    '{RANDOM_3}':     utils.randomString(40)
  };

  return await replaceInDirectory(directory, replacements);
};
