
const FileUtils     = require('./fs/FileUtils');
const Parser        = require('./parse/Parser');
const Compiler      = require('./compile/Compiler');
const ComponentSplitter   = require('./compile/ComponentSplitter');
const config        = require('./Config');

class Cache {

  constructor() {
    this._CACHE = {};
  }

  async _getOrSet(filePath, type, generator) {
    // normalize file path
    filePath    = FileUtils.getFilePath(filePath);
    const key   = `${type}:${filePath}`;

    if (config.cache && this._CACHE[key]) {
      return this._CACHE[key];
    }

    const promise = generator(filePath);
    if (config.cache) {
      // cache the promise right away so concurrent calls share one compilation;
      // replace it with the resolved value, drop it on failure so retries can succeed
      this._CACHE[key] = promise;
      promise.then(
        (result) => { this._CACHE[key] = result; },
        () => { delete this._CACHE[key]; }
      );
    }
    return promise;
  }

  async _getParsed(filePath) {
    return this._getOrSet(filePath, 'parsed', async (filePath) => {
      const src = await FileUtils.loadFile(filePath);
      return new Parser().parse(src);
    });
  }

  async getCompiled(filePath) {
    return this._getOrSet(filePath, 'compiled', async (filePath) => {
      const buffer = await this._getParsed(filePath);
      return new Compiler().compile(buffer);
    });
  }

  // Sync cache lookup for the hot path: returns the compiled fn or undefined.
  // Lets renderFile skip the async chain entirely on cache hits.
  getCompiledCached(filePath) {
    if (!config.cache) {
      return undefined;
    }
    const cached = this._CACHE['compiled:' + FileUtils.getFilePath(filePath)];
    // the entry is a promise while compilation is in flight: not usable synchronously
    return typeof cached === 'function' ? cached : undefined;
  }

  async getSource(filePath) {
    return this._getOrSet(filePath, 'source', async (filePath) => {
      const buffer = await this._getParsed(filePath);
      return new Compiler().toSource(buffer);
    });
  }

  // Split a single-file component and return { scriptSrc, templateSource }
  async getComponent(filePath) {
    return this._getOrSet(filePath, 'sfc', async (filePath) => {
      const raw = await FileUtils.loadFile(filePath);
      const { scriptSrc, templateSrc } = ComponentSplitter.split(raw);
      if (!scriptSrc) {
        return { scriptSrc: null, templateSource: null };
      }
      const rewritten = ComponentSplitter.rewriteOnEvents(templateSrc);
      const buffer    = new Parser().parse(rewritten);
      return {
        scriptSrc,
        templateSource: new Compiler().toSource(buffer),
      };
    });
  }

  // Compile a single-file component and return { scriptSrc, templateFn }
  async getCompiledComponent(filePath) {
    return this._getOrSet(filePath, 'sfc_compiled', async (filePath) => {
      const raw = await FileUtils.loadFile(filePath);
      const { scriptSrc, templateSrc } = ComponentSplitter.split(raw);
      if (!scriptSrc) {
        return { scriptSrc: null, templateFn: null };
      }
      const rewritten = ComponentSplitter.rewriteOnEvents(templateSrc);
      const buffer    = new Parser().parse(rewritten);
      return {
        scriptSrc,
        templateFn: new Compiler().compile(buffer),
      };
    });
  }

};

module.exports = new Cache();
