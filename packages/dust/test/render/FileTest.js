
const assert    = require('assert');

const FileUtils = require('../../src/fs/FileUtils');
const Renderer  = require('../../src/render/Renderer');
const Cache     = require('../../src/Cache');
const config    = require('../../src/Config');
const IgoDust   = require('../../index');

//
describe('Render Files', () => {

  it('should render email template with css', async () => {
    const r   = await new Renderer().renderFile('./test/templates/email.dust', {});
    assert(r.match(/img {/));
    assert(r.match(/tr > td {/));
  });

  it('should share one compilation between concurrent calls when cache is on', async () => {
    config.configure({ cache: true });
    const originalLoad = FileUtils.loadFile;
    let loads = 0;
    FileUtils.loadFile = async (p) => { loads++; return originalLoad(p); };
    try {
      const file = './test/templates/_hello.dust';
      const [fn1, fn2] = await Promise.all([IgoDust.compileFile(file), IgoDust.compileFile(file)]);
      assert.strictEqual(loads, 1, 'concurrent compilations should share one file read');
      assert.strictEqual(fn1, fn2);
      // once resolved, the compiled fn is available synchronously for the fast path
      assert.strictEqual(typeof Cache.getCompiledCached(file), 'function');
    } finally {
      FileUtils.loadFile = originalLoad;
      config.configure({ cache: false });
    }
  });

});