require('../init');

const assert = require('assert');
const config = require('@igojs/server').config;
const { isApiRoute, wantsJson } = require('@igojs/server/src/api/request');

// Accept header of the crawler (TernCrawler) that got a 500 on a page: HTML
// first, JSON cited with a lower weight.
const CRAWLER_ACCEPT = 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.7,*/*;q=0.5';

describe('api/request', function() {

  describe('isApiRoute', function() {

    it('should recognize the api prefix', () => {
      assert(isApiRoute({ path: '/api/books', headers: {} }));
      assert(isApiRoute({ path: '/api', headers: {} }));
    });

    it('should not mistake a path that merely starts with the prefix', () => {
      assert(!isApiRoute({ path: '/apidocs', headers: {} }));
    });

    it('should ignore the Accept header', () => {
      assert(!isApiRoute({ path: '/signup', headers: { accept: 'application/json' } }));
      assert(!isApiRoute({ path: '/signup', headers: { accept: CRAWLER_ACCEPT } }));
    });

    it('should follow a custom prefix', () => {
      const initial = config.api.prefix;
      config.api.prefix = '/v1';
      try {
        assert(isApiRoute({ path: '/v1/books', headers: {} }));
        assert(!isApiRoute({ path: '/api/books', headers: {} }));
      } finally {
        config.api.prefix = initial;
      }
    });
  });

  describe('wantsJson', function() {

    it('should want json on an api route, whatever the Accept header', () => {
      assert(wantsJson({ path: '/api/books', headers: {} }));
      assert(wantsJson({ path: '/api/books', headers: { accept: 'text/html' } }));
    });

    it('should want json from a client asking for it', () => {
      assert(wantsJson({ path: '/books', headers: { accept: 'application/json' } }));
      // axios default
      assert(wantsJson({ path: '/books', headers: { accept: 'application/json, text/plain, */*' } }));
    });

    it('should want html from a browser or crawler preferring it', () => {
      assert(!wantsJson({ path: '/signup', headers: { accept: CRAWLER_ACCEPT } }));
      assert(!wantsJson({ path: '/books', headers: { accept: 'text/html' } }));
    });

    it('should want html without a preference', () => {
      assert(!wantsJson({ path: '/books', headers: {} }));
      assert(!wantsJson({ path: '/books', headers: { accept: '*/*' } }));
    });
  });
});
