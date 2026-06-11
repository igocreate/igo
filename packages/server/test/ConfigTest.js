require('./init');

const assert = require('assert');
const config = require('@igojs/server').config;

describe('igo.config', () => {

  describe('config.checkSecrets', () => {

    const withConfig = (overrides, fn) => {
      const saved = {
        env:                    config.env,
        cookieSecret:           config.cookieSecret,
        cookieSession:          config.cookieSession,
        cookieSessionMiddleware: config.cookieSessionMiddleware,
      };
      Object.assign(config, overrides);
      try {
        fn();
      } finally {
        Object.assign(config, saved);
      }
    };

    it('should do nothing outside production', () => {
      withConfig({ env: 'dev' }, () => {
        config.checkSecrets();
      });
    });

    it('should throw in production with default secrets', () => {
      withConfig({ env: 'production' }, () => {
        assert.throws(() => config.checkSecrets(), /production/);
      });
    });

    it('should pass in production with custom secrets', () => {
      withConfig({
        env:            'production',
        cookieSecret:   'real-secret',
        cookieSession:  { keys: ['real-key'] },
      }, () => {
        config.checkSecrets();
      });
    });

    it('should ignore default keys when a custom session middleware is set', () => {
      withConfig({
        env:                    'production',
        cookieSecret:           'real-secret',
        cookieSessionMiddleware: () => {},
      }, () => {
        config.checkSecrets();
      });
    });
  });

});
