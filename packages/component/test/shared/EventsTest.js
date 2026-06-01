const assert = require('assert');
const { extractEventBindings } = require('../../src/shared/events.js');

describe('extractEventBindings', () => {

  it('keeps regular props untouched', () => {
    const { props, attrs } = extractEventBindings({ name: 'client_id', label: 'Client' });
    assert.deepStrictEqual(props, { name: 'client_id', label: 'Client' });
    assert.strictEqual(attrs, '');
  });

  it('extracts a data-on-* binding into a data-emit-* attribute', () => {
    const { props, attrs } = extractEventBindings({
      name:            'client_id',
      'data-on-change': 'onClientChange',
    });
    assert.deepStrictEqual(props, { name: 'client_id' });
    assert.strictEqual(attrs, ' data-emit-change="onClientChange"');
  });

  it('handles several event bindings', () => {
    const { props, attrs } = extractEventBindings({
      'data-on-change': 'onChange',
      'data-on-open':   'onOpen',
    });
    assert.deepStrictEqual(props, {});
    assert.strictEqual(attrs, ' data-emit-change="onChange" data-emit-open="onOpen"');
  });

  it('html-escapes the method name', () => {
    const { attrs } = extractEventBindings({ 'data-on-change': 'a"b' });
    assert.ok(!attrs.includes('a"b'));
    assert.ok(attrs.includes('a&quot;b'));
  });

});
