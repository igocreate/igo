
const Utils     = require('./Utils');
const Cache     = require('../Cache');

const Parser    = require('../parse/Parser');
const Compiler  = require('../compile/Compiler');

class Renderer {

  // render string template
  async render(str, data, res) {
    const buffer    = new Parser().parse(str);
    const compiled  = new Compiler().compile(buffer);
    return await this.renderCompiled(compiled, data, res);
  }

  // render file template
  async renderFile(filePath, data, res) {
    const compiled = await Cache.getCompiled(filePath);
    return await this.renderCompiled(compiled, data, res);
  }

  // render compiled template
  async renderCompiled(compiled, data, res) {
    return await compiled(data, Utils, null, res);
  }

}

module.exports = Renderer;
