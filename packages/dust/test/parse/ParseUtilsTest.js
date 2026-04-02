
/* global describe, it */

const assert  = require('assert');

const ParseUtils  = require('../../src/parse/ParseUtils');

describe('ParseUtils', () => {
  it('should parse params', () => {
    const tag = '> "hello world" a="azer ty" b=user.name c="hello {world}" ';
    const params = ParseUtils.parseParams(tag);

    assert.equal(params.$, '"hello world"');
    assert.equal(params.a, '"azer ty"');
    assert.equal(params.b, 'user.name');
    assert.equal(params.c, '"hello {world}"');

  });

  it('should handle = signs in params', () => {
    const tag = '> "hello = world" a="azer = ty"';
    const params = ParseUtils.parseParams(tag);

    assert.equal(params.$, '"hello = world"');
    assert.equal(params.a, '"azer = ty"');

  });

  it('should handle = signs in params', () => {
    const tag = '> "hello" url="/search?q={.q}" test=ok url2="/search?q={.q}" ';
    const params = ParseUtils.parseParams(tag);

    assert.equal(params.$, '"hello"');
    assert.equal(params.url, '"/search?q={.q}"');
  });

  it('should handle shorthand params', () => {
    const tag = '@component name="components/Counter" count ';
    const params = ParseUtils.parseParams(tag);

    assert.equal(params.name, '"components/Counter"');
    assert.equal(params.count, 'count');
  });

  it('should not override explicit params with shorthand', () => {
    const tag = '@component name="components/Counter" count=otherVar ';
    const params = ParseUtils.parseParams(tag);

    assert.equal(params.count, 'otherVar');
  });

});
