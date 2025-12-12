/* global describe, it */

const assert    = require('assert');

const config  = require('../../src/Config');
const Renderer  = require('../../src/render/Renderer');
const Helpers   = require('../../src/render/Helpers');

describe('Render Basics', () => {

  it('should render simple text', async () => {
    const template  = 'Hello World';
    const r         = await new Renderer().render(template);
    assert.equal(r, template);
  });

  it('should replace simple text', async () => {
    const template  = 'Hello {w}';
    const r         = await new Renderer().render(template, { w: 'World' });
    assert.equal(r, 'Hello World');
  });

  it('should not crash when reference does not exist', async () => {
    const template  = 'Hello {a.b.c}';
    const r         = await new Renderer().render(template);
    assert.equal(r, 'Hello ');
  });

  it('should not crash when reference does not exist and not escaped', async () => {
    const template  = 'Hello {a.b.c|s}';
    const r         = await new Renderer().render(template);
    assert.equal(r, 'Hello ');
  });

  it('should ignore comment', async () => {
    const template  = 'Hello {! comment !}World';
    const r         = await new Renderer().render(template);
    assert.equal(r, 'Hello World');
  });

  it('should ignore tag inside comment', async () => {
    const template  = 'Hello {! comment {test} !}World';
    const r         = await new Renderer().render(template);
    assert.equal(r, 'Hello World');
  });

  it('should allow escaped special characters', async () => {
    const template  = 'Hello \' \\ " " World';
    const r         = await new Renderer().render(template);
    assert.equal(r, template);
  });

  it('should execute function if reference is a function', async () => {
    const template  = 'Hello {w}';
    const r         = await new Renderer().render(template, { w: () => 'World' });
    assert.equal(r, 'Hello World');
  });

  it('should access objects by key in references', async () => {
    const template  = 'Hello {users[hello].lastname}';
    const r         = await new Renderer().render(template, { users: { john : { lastname: 'World' }}, hello: 'john' });
    assert.equal(r, 'Hello World');
  });

  it('should access objects by complex key in references', async () => {
    const template  = 'Hello {users[hello.one].lastname}';
    const r         = await new Renderer().render(template, { users: { john : { lastname: 'World' }}, hello: { one: 'john' } });
    assert.equal(r, 'Hello World');
  });

  it('should access objects by complex key in references', async () => {
    const template  = 'Hello {users[hello.one].lastname}';
    const r         = await new Renderer().render(template, { users: { john : { lastname: 'World' }}, hello: { one: 'john' } });
    assert.equal(r, 'Hello World');
  });

  it('should access array elements by index in references', async () => {
    const template  = 'Hello {users[1]}';
    const r         = await new Renderer().render(template, { users: [ 'john', 'World' ]});
    assert.equal(r, 'Hello World');
  });

  it('should access array elements by index in references', async () => {
    const template  = 'Hello {users[idx].lastname}';
    const r         = await new Renderer().render(template, { users: [ {}, { lastname: 'World' } ], idx: 1});
    assert.equal(r, 'Hello World');
  });

  it('should render 0 value in reference', async () => {
    const template  = 'Hello {zero}';
    const r         = await new Renderer().render(template, { zero: 0 });
    assert.equal(r, 'Hello 0');
  });

  it('should render 0 value in param', async () => {
    const template  = 'Hello {@tap value="{zero}" /}';
    Helpers.tap = (params, locals) => { return params.value; };
    const r         = await new Renderer().render(template, { zero: 0 });
    assert.equal(r, 'Hello 0');
  });

  it('should keep line returns if htmltrim is disabled', async () => {
    config.configure({htmltrim: false});
    const template  = ' Hello \r\n World \r\n<meta name="description" content="{+description/}">\r\n OK.';
    const r         = await new Renderer().render(template, {});
    assert.strictEqual(r, ' Hello \r\n World \r\n<meta name="description" content="">\r\n OK.');
    config.configure({htmltrim: true});
  });

  

});