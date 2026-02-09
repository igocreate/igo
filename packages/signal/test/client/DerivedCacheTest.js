const assert = require('assert');
const DerivedCache = require('../../src/client/DerivedCache.js');

describe('DerivedCache', () => {

  it('should cache computed values', () => {
    const cache = new DerivedCache();
    const context = { props: { value: 1 }, state: {} };
    let callCount = 0;

    const fn = () => ++callCount;

    cache.memoize('test', fn, [], context, fn());
    cache.memoize('test', fn, [], context);

    assert.strictEqual(callCount, 1);
  });

  it('should recompute when deps change', () => {
    const cache = new DerivedCache();
    const context = { props: { count: 1 }, state: {} };

    const fn = () => context.props.count * 2;

    cache.memoize('double', fn, [['props', 'count']], context, fn());
    context.props.count = 5;
    const result = cache.memoize('double', fn, [['props', 'count']], context);

    assert.strictEqual(result, 10);
  });

  it('should clear all cached values', () => {
    const cache = new DerivedCache();
    let count = 0;
    const fn = () => ++count;

    cache.memoize('a', fn, [], {}, fn());
    cache.clear();
    cache.memoize('a', fn, [], {});

    assert.strictEqual(count, 2);
  });

});
