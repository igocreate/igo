

const config              = require('../Config');
const path                = require('path');
const fs                  = require('fs').promises;

// get absolute path
module.exports.getFilePath = (filePath) => {
  if (!path.isAbsolute(filePath) && filePath[0] !== '.') {
    // prefix views folder
    filePath = `${config.views}/${filePath}`;
  }
  return path.resolve(filePath);
};

//
module.exports.loadFile = async (filePath) => {
  return await fs.readFile(filePath, 'utf8');
};
