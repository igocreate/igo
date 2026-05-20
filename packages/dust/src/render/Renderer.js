
const Utils     = require('./Utils');
const Cache     = require('../Cache');

const Parser    = require('../parse/Parser');
const Compiler  = require('../compile/Compiler');

class Renderer {

  // render string template
  async render(str, data) {
    const buffer    = new Parser().parse(str);
    const compiled  = new Compiler().compile(buffer);
    return await this.renderCompiled(compiled, data);
  }

  // render file template
  async renderFile(filePath, data) {
    const compiled = await Cache.getCompiled(filePath);
    return await this.renderCompiled(compiled, data);
  }

  // render compiled template
  async renderCompiled(compiled, data) {
    return await compiled(data, Utils, null);
  }

}

module.exports = Renderer;
