/* global describe, it */

const assert    = require('assert');

const Renderer  = require('../../src/render/Renderer');

class Stream {
  constructor() {
    this.buffer = '';
  }
  
  write(x) {
    if (typeof x !== 'string') {
      throw new Error('chunk must be a string, found ' + typeof x);
    }
    this.buffer += x;
  }

}

//
describe('Stream response', () => {

  it('should stream simple response', async () => {
    const template  = 'Hello World';
    const stream    = new Stream();
    await new Renderer().render(template, {}, stream);
    assert.equal(stream.buffer, template);
  });  

  it('should stream response with include', async () => {
    const template  = '{> "./test/templates/layout" /} {<content}{test.w}{/content}';
    const stream    = new Stream();
    await new Renderer().render(template, {test: {w: 'World'}}, stream);
    assert.equal(stream.buffer, 'Hello World! ');
  });

  it('should execute function if tag is a function', async () => {
    const template  = 'Hello {#t key="World" /}';
    const stream    = new Stream();
    await new Renderer().render(template, { t: (params) => params.key }, stream);
    assert.equal(stream.buffer, 'Hello World');
  });


});