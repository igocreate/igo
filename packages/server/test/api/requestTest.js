require('../init');

const assert = require('assert');
const config = require('@igojs/server').config;
const { isApiRequest } = require('@igojs/server/src/api/request');

describe('api/request', function() {

  describe('isApiRequest', function() {

    it('should recognize the api prefix', () => {
      assert(isApiRequest({ path: '/api/books', headers: {} }));
      assert(isApiRequest({ path: '/api', headers: {} }));
    });

    it('should not mistake a path that merely starts with the prefix', () => {
      assert(!isApiRequest({ path: '/apidocs', headers: {} }));
    });

    it('should recognize a client asking for json', () => {
      assert(isApiRequest({ path: '/books', headers: { accept: 'application/json' } }));
    });

    it('should leave a regular page request alone', () => {
      assert(!isApiRequest({ path: '/books', headers: { accept: 'text/html' } }));
      assert(!isApiRequest({ path: '/books', headers: {} }));
    });

    it('should follow a custom prefix', () => {
      const initial = config.api.prefix;
      config.api.prefix = '/v1';
      try {
        assert(isApiRequest({ path: '/v1/books', headers: {} }));
        assert(!isApiRequest({ path: '/api/books', headers: {} }));
      } finally {
        config.api.prefix = initial;
      }
    });
  });
});
