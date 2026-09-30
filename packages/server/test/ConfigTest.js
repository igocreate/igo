require('./init');

const assert = require('assert');
const path   = require('path');
const config = require('@igojs/server').config;

describe('igo.config', () => {

  describe('app identity', () => {

    it('should name the app after the project package, for crash emails and logs', () => {
      const projectPackage = require('./project/package.json');
      assert.strictEqual(config.appname, projectPackage.name);
      assert.strictEqual(config.version, projectPackage.version);
    });

    it('should identify the service and the deployment in logs by default', () => {
      assert.strictEqual(config.servicename, require('./project/package.json').name);
      assert.strictEqual(config.environment, config.env);
    });

    // `serve` scripts run from dist/, which has no package.json of its own
    it('should climb to the nearest package.json when projectRoot is a build directory', () => {
      const found = config.readProjectPackage(path.join(__dirname, 'project', 'app'));
      assert.strictEqual(found.name, require('./project/package.json').name);
    });

    it('should boot a project with no package.json at all', () => {
      assert.deepStrictEqual(config.readProjectPackage(path.parse(__dirname).root), {});
    });
  });

  // init() runs once per process, so the parser is tested on its own
  describe('LOG_REQUESTS', () => {
    const parse = config.parseLogRequests;

    it('should read a status floor', () => {
      assert.strictEqual(parse('400', true), 400);
    });

    it('should read true and false', () => {
      assert.strictEqual(parse('true', false), true);
      assert.strictEqual(parse('false', true), false);
    });

    it('should keep the default when unset or not understood', () => {
      assert.strictEqual(parse(undefined, true), true);
      assert.strictEqual(parse('loud', false), false);
      assert.strictEqual(parse('0', true), true);
    });
  });

  describe('LOG_HTTP_CALLS_BY_HOST', () => {
    const parse = config.parseLogHttpCallsByHost;

    it('should read a setting per host', () => {
      assert.deepStrictEqual(parse('api.elap.io=true, particulier.api.gouv.fr=500,localhost:8080=false'), {
        'api.elap.io':            true,
        'particulier.api.gouv.fr': 500,
        'localhost:8080':         false,
      });
    });

    it('should drop the pairs it does not understand', () => {
      assert.deepStrictEqual(parse('api.elap.io=loud,=400,api.brevo.com,a=1=2,API.Brevo.com=400'), {
        'api.brevo.com': 400,
      });
    });

    it('should read nothing when unset', () => {
      assert.deepStrictEqual(parse(undefined), {});
    });
  });

  describe('config.checkSecrets', () => {

    const withConfig = (overrides, fn) => {
      const saved = {
        env:            config.env,
        cookieSecret:   config.cookieSecret,
        cookieSession:  config.cookieSession,
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

    it('should throw in production with default session keys', () => {
      withConfig({
        env:            'production',
        cookieSecret:   'real-secret',
      }, () => {
        assert.throws(() => config.checkSecrets(), /production/);
      });
    });
  });

});
