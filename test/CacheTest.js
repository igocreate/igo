

require('../src/dev/test/init');


const assert    = require('assert');
const _         = require('lodash');

const cache     = require('../src/cache');

describe('igo.cache', function() {

  it('should return undefined if key is not found', function(done) {
    cache.get('nsx', 0, function(err, value) {
      assert(value === undefined);
      done();
    });
  });

  it('should store string values', function(done) {
    cache.put('ns', 0, 'hello', function() {
      cache.get('ns', 0, function(err, value) {
        assert(value === 'hello');
        done();
      });
    });
  });

  it('should store null values', function(done) {
    cache.put('ns', 0, null, function() {
      cache.get('ns', 0, function(err, value) {
        assert(value === null);
        done();
      });
    })
  });

  it('should store dates', function(done) {
    cache.put('ns', 0, new Date(), function() {
      cache.get('ns', 0, function(err, value) {
        assert(value !== null);
        assert(_.isDate(value));
        done();
      });
    })
  });

  it('should store objects with dates', function(done) {
    cache.put('ns', 0, { t0: new Date() }, function() {
      cache.get('ns', 0, function(err, value) {
        assert(value !== null);
        assert(_.isDate(value.t0));
        done();
      });
    })
  });

  it('should store buffers', function(done) {
    const buffer = Buffer.from('hello world', 'utf8');
    cache.put('ns', 0, buffer, function() {
      cache.get('ns', 0, function(err, value) {
        assert(value !== null);
        assert(_.isBuffer(value));
        assert.equal(buffer.toString(), value.toString());
        done();
      });
    })
  });
});
