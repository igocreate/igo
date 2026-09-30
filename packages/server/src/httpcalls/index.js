const config        = require('../config');
const logHttpCalls  = require('./axios');
const logFetchCalls = require('./fetch');

// The project's copy of axios, not igo's: its instance is the one in use.
const projectAxios = () => {
  let path;
  try {
    path = require.resolve('axios', { paths: [config.projectRoot] });
  } catch {
    return null;
  }
  return require(path);
};

module.exports.init = () => {
  logHttpCalls(projectAxios());
  logFetchCalls();
};

module.exports.logHttpCalls = logHttpCalls;
