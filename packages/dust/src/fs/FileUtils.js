

const config              = require('../Config');
const path                = require('path');
const fs                  = require('fs').promises;

// memoize resolution when caching is on (dev disables cache to pick up file changes)
const RESOLVED = new Map();

// get absolute path
module.exports.getFilePath = (filePath) => {
  if (config.cache) {
    const cached = RESOLVED.get(filePath);
    if (cached !== undefined) {
      return cached;
    }
  }
  let resolved = filePath;
  if (!path.isAbsolute(resolved) && resolved[0] !== '.') {
    // prefix views folder
    resolved = `${config.views}/${resolved}`;
  }
  resolved = path.resolve(resolved);
  if (config.cache) {
    RESOLVED.set(filePath, resolved);
  }
  return resolved;
};

//
module.exports.loadFile = async (filePath) => {
  return await fs.readFile(filePath, 'utf8');
};
