

const Config    = require('./src/Config');
const Cache     = require('./src/Cache');
const Renderer  = require('./src/render/Renderer');
const Helpers   = require('./src/render/Helpers');
const Utils     = require('./src/render/Utils');


// configure igo-dust
module.exports.configure = (options) => {
  Config.configure(options);
};

// compile template
module.exports.compileFile = async (filePath) => {
  return await Cache.getCompiled(filePath);
};

// get template source
module.exports.getSource = async (filePath) => {
  return await Cache.getSource(filePath);
};

// render template
module.exports.render = async (src, data) => {
  return await new Renderer().render(src, data);
};

// render template file
module.exports.renderFile = async (filePath, data) => {
  // Fast path: compiled fn already cached → skip Renderer + Cache async chain.
  const compiled = Cache.getCompiledCached(filePath);
  if (compiled) {
    return await compiled(data, Utils, null);
  }
  return await new Renderer().renderFile(filePath, data);
};

// expressjs engine
module.exports.engine = async (filePath, data, callback) => {
  try {
    const rendered = await module.exports.renderFile(filePath, data);
    return callback(null, rendered);
  } catch (err) {
    return callback(err);
  }
};

// Component (single-file .dust component) support
module.exports.getComponent = async (filePath) => {
  return await Cache.getComponent(filePath);
};

module.exports.getCompiledComponent = async (filePath) => {
  return await Cache.getCompiledComponent(filePath);
};

// Helpers and filters
module.exports.helpers = Helpers;
module.exports.filters = Utils.f;
