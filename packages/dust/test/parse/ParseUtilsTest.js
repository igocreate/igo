
const assert      = require('assert');

const ParseUtils  = require('../../src/parse/ParseUtils');

describe('ParseUtils', () => {

  describe('removeComments', () => {
    it('should remove a comment', () => {
      assert.equal(ParseUtils.removeComments('a{! x !}b'), 'ab');
    });

    it('should remove adjacent comments', () => {
      assert.equal(ParseUtils.removeComments('{! a !}{! b !}x'), 'x');
      assert.equal(ParseUtils.removeComments('a{! x !}b{! y !}c{! z !}d'), 'abcd');
    });

    it('should keep an unclosed comment', () => {
      assert.equal(ParseUtils.removeComments('a{! x b'), 'a{! x b');
    });
  });

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

  it('should parse hyphenated param names (e.g. data-on-* event bindings)', () => {
    const tag = '@component "components/Select" name="client_id" data-on-change="onClientChange" ';
    const params = ParseUtils.parseParams(tag);

    assert.equal(params.$, '"components/Select"');
    assert.equal(params.name, '"client_id"');
    assert.equal(params['data-on-change'], '"onClientChange"');
  });

});
