

const { execFile } = require('child_process');
const fs      = require('fs/promises');
const path    = require('path');
const { promisify } = require('util');

const _       = require('lodash');
const fse     = require('fs-extra');

const config  = require('../src/config');
const utils   = require('../src/utils');

// rename files starting with _. to . in the project directory
const renameUnderscoreFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    let srcPath = path.join(dir, entry.name);

    // npm refuses to publish a directory containing .gitignore, .husky and the
    // like, so the skeletons ship them prefixed.
    if (entry.name.startsWith('_.')) {
      const destPath = path.join(dir, '.' + entry.name.slice(2));
      await fse.move(srcPath, destPath, { overwrite: true });
      srcPath = destPath;
    }

    if (entry.isDirectory()) {
      await renameUnderscoreFiles(srcPath); // récursif
    }
  }
};

// replace all occurrences of a regexp in files in a directory
const replaceInDirectory = async (dir, replacements) => {
  const files = await fs.readdir(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = await fs.lstat(fullPath);

    if (stat.isDirectory() && file !== 'node_modules') {
      await replaceInDirectory(fullPath, replacements);
    } else if (stat.isFile()) {
      let content = await fs.readFile(fullPath, 'utf8');
      let updated = false;

      _.forOwn(replacements, (replacement, regexp) => {
        const regex = new RegExp(regexp, 'g');
        const newContent = content.replace(regex, replacement);
        if (newContent !== content) {
          content = newContent;
          updated = true;
        }
      });

      if (updated) {
        await fs.writeFile(fullPath, content, 'utf8');
      }
    }
  }
};

// A skeleton ships .env.example files; the project needs a .env to boot. A
// missing one costs a confusing first error, so copy them — never overwriting
// an existing .env.
const seedEnvFiles = async (dir) => {
  const copied = [];

  const walk = async (current) => {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        await walk(full);
      } else if (entry.name === '.env.example') {
        const target = path.join(current, '.env');
        if (!await fse.pathExists(target)) {
          await fse.copy(full, target);
          copied.push(path.relative(dir, target));
        }
      }
    }
  };

  await walk(dir);
  return copied;
};

// The husky prepare script runs on install and fails without a repository, and
// a project with no history has no safety net for its first changes. Failure is
// not fatal: git may be absent, or the directory already inside a repository.
const initRepository = async (dir) => {
  try {
    await promisify(execFile)('git', ['init', '--quiet'], { cwd: dir });
    return true;
  } catch {
    return false;
  }
};

// igo create
const SKELETONS = ['tailwind', 'fullstack'];

module.exports = async function (argv) {
  const args = argv._;
  if (args.length !== 2) {
    console.warn('Usage: igo create <project-directory> [--skel=' + SKELETONS.join('|') + ']');
    process.exit(1);
  }

  const model = argv.skel || 'tailwind';
  if (!SKELETONS.includes(model)) {
    console.warn(`Unknown skeleton '${model}'. Available: ${SKELETONS.join(', ')}.`);
    process.exit(1);
  }

  const directory = './' + args[1];

  await fs.mkdir(directory);

  // recursive copy from skel to project directory
  await fse.copy(path.join(__dirname, '../skel', model), directory, { overwrite: false });

  await renameUnderscoreFiles(directory);

  const igoVersion = require('../package.json').version;
  const replacements = {
    '{igo.version}':  igoVersion,
    '{project.name}': args[1],
    '{RANDOM_1}':     utils.randomString(40),
    '{RANDOM_2}':     utils.randomString(40),
    '{RANDOM_3}':     utils.randomString(40)
  };

  await replaceInDirectory(directory, replacements);

  const envFiles = await seedEnvFiles(directory);
  const repository = await initRepository(directory);

  // Tests call this function directly, and a reporter parsing stdout cannot
  // afford a stray line.
  if (config.env === 'test') {
    return;
  }

  console.log(`Created ${args[1]} from the ${model} skeleton.`);
  if (envFiles.length) {
    console.log(`  .env written: ${envFiles.join(', ')}`);
  }
  if (!repository) {
    console.log('  no git repository created — run `git init` yourself');
  }
};
