

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
module.exports.render = async (src, data, stream=null) => {
  return await new Renderer().render(src, data, stream);
};

// render template file
module.exports.renderFile = async (filePath, data, stream=null) => {
  return await new Renderer().renderFile(filePath, data, stream);
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

// Helpers and filters
module.exports.helpers = Helpers;
module.exports.filters = Utils.f;
