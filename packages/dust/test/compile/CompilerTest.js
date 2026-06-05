const assert  = require('assert');

// const Parser    = require('../../src/parse/Parser');
const Compiler  = require('../../src/compile/Compiler');
const Utils     = require('../../src/render/Utils');

describe('Compiler', () => {

  it('should compiler simple text', async () => {
    const buffer  = [ 'Hello World' ];
    const fn      = new Compiler().compile(buffer);
    const r       = await fn({}, Utils);
    assert.equal(r, buffer[0]);
  });

  it('should compile multiples lines', async () => {
    const buffer  = [ 'Hello ', 'World' ];
    const fn      = new Compiler().compile(buffer);
    const r       = await fn({}, Utils);
    assert.equal(r, buffer.join(''));
  });

  it('should replace reference', async () => {
    const buffer  = [ 'Hello ', {type: 'r', tag: 'name'} ];
    const fn      = new Compiler().compile(buffer);
    const r       = await fn({ name: 'World'}, Utils);
    assert.equal(r, 'Hello World');
  });

  it('should replace missing reference', async () => {
    const buffer  = [ 'Hello ', {type: 'r', tag: 'name'} ];
    const fn      = new Compiler().compile(buffer);
    const r       = await fn({}, Utils);
    assert.equal(r, 'Hello ');
  });

  it('should replace attributes', async () => {
    const buffer  = [ 'Hello ', {type: 'r', tag: 'user.name'} ];
    const fn      = new Compiler().compile(buffer);
    const r       = await fn({user: { name: 'John'}}, Utils);
    assert.equal(r, 'Hello John');
  });

  it('should replace missing attributes', async () => {
    const buffer  = [ 'Hello ', {type: 'r', tag: 'user.email'} ];
    const fn      = new Compiler().compile(buffer);
    const r       = await fn({}, Utils);
    assert.equal(r, 'Hello ');
  });

  it('should escape xml characters in references', async () => {
    const buffer  = [ 'Hello ', {type: 'r', tag: 'name', f: ['h']} ];
    const fn      = new Compiler().compile(buffer);
    const r       = await fn({name: '<World>'}, Utils);
    assert.equal(r, 'Hello &lt;World&gt;');
  });

  it('should *not* escape xml characters in raw references', async () => {
    const buffer  = [ 'Hello ', {type: 'r', tag: 'name', f: []} ];
    const fn      = new Compiler().compile(buffer);
    const r       = await fn({name: '<World>'}, Utils);
    assert.equal(r, 'Hello <World>');
  });

  it('should apply filters', async () => {
    const buffer  = [ 'Hello ', {type: 'r', tag: 'name', f: ['uppercase', 'h']} ];
    const fn      = new Compiler().compile(buffer);
    const r       = await fn({name: '<World>'}, Utils);
    assert.equal(r, 'Hello &lt;WORLD&gt;');
  });

  it('should quote non-identifier param keys ($ positional, data-on-* bindings)', async () => {
    // Without JSON.stringify on the keys, the generated `{data-on-change:...}`
    // is invalid JS and compile() throws a SyntaxError.
    let captured;
    Utils.h.helpers.capture = (p) => { captured = p; return ''; };

    const buffer = [ {
      type: '@',
      tag: 'capture',
      params: { '$': '"components/Select"', name: '"client_id"', 'data-on-change': '"onClientChange"' },
    } ];

    const fn = new Compiler().compile(buffer);  // must not throw
    await fn({}, Utils);

    assert.equal(captured.$, 'components/Select');
    assert.equal(captured.name, 'client_id');
    assert.equal(captured['data-on-change'], 'onClientChange');

    delete Utils.h.helpers.capture;
  });

  it('should quote non-identifier param keys in {>} includes (data-* bindings)', () => {
    // Reproduces the /vehicles form 500: a partial included with a hyphenated
    // param key — {> "components/forms/_select" data-input="input[name=type]" /} —
    // makes _pushContext emit `l.data-input=...` (dot notation), which is invalid
    // JS, so compile() throws a SyntaxError.
    const buffer = [ {
      type: '>',
      tag: '',
      selfClosedTag: true,
      file: '"components/forms/_select"',
      params: { '$': '"components/forms/_select"', 'data-input': '"input[name=type]"' },
    } ];

    assert.doesNotThrow(() => new Compiler().compile(buffer));
  });

});