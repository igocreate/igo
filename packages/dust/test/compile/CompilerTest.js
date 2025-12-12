/* global describe, it */
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

});