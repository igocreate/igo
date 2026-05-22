const assert = require('assert');
const ComponentController = require('../../src/server/ComponentController');

// Minimal req/res factories
const makeRes = () => ({
  locals: {},
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; }
});

const makeReq = ({ i18n, language, query } = {}) => ({
  i18n, language, query: query || {}
});

describe('ComponentController', () => {

  describe('translations endpoint', () => {

    it('returns the resource bundle for the current request language', () => {
      const i18n = {
        language: 'fr',
        getResourceBundle(lang) {
          return lang === 'fr' ? { hello: 'Bonjour' } : { hello: 'Hello' };
        }
      };
      const req = makeReq({ i18n, language: 'fr' });
      const res = makeRes();
      ComponentController.translations(req, res);

      assert.deepStrictEqual(res.body, { hello: 'Bonjour' });
    });

    it('falls back to {} when no i18n is attached', () => {
      const req = makeReq();
      const res = makeRes();
      ComponentController.translations(req, res);

      assert.deepStrictEqual(res.body, {});
    });

  });

  describe('templates endpoint', () => {

    it('rejects path traversal', async () => {
      const req = makeReq({ query: { file: '../etc/passwd' } });
      const res = makeRes();
      await ComponentController.templates(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.match(res.body.error, /Invalid file name/);
    });

    it('rejects requests with disallowed characters', async () => {
      const req = makeReq({ query: { file: 'components/foo$bar' } });
      const res = makeRes();
      await ComponentController.templates(req, res);

      assert.strictEqual(res.statusCode, 400);
    });

  });

  describe('component endpoint', () => {

    it('rejects path traversal', async () => {
      const req = makeReq({ query: { name: '../secrets' } });
      const res = makeRes();
      await ComponentController.component(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.match(res.body.error, /Invalid component name/);
    });

    it('returns 404 (not 400) for valid names with no matching file', async () => {
      for (const name of ['layouts/main', 'emails/welcome', 'Counter']) {
        const req = makeReq({ query: { name } });
        const res = makeRes();
        await ComponentController.component(req, res);
        assert.strictEqual(res.statusCode, 404, `${name} should pass validation`);
      }
    });

    it('returns 404 when the component file does not exist', async () => {
      const req = makeReq({ query: { name: 'components/does/not/exist' } });
      const res = makeRes();
      await ComponentController.component(req, res);

      assert.strictEqual(res.statusCode, 404);
      assert.ok(res.body.error);
    });

  });

  describe('init(app)', () => {

    it('registers the three GET endpoints', () => {
      const calls = [];
      const fakeApp = {
        get(path, fn) { calls.push({ path, fn }); }
      };

      ComponentController.init(fakeApp);

      assert.deepStrictEqual(
        calls.map(c => c.path).sort(),
        ['/__component/component', '/__component/templates', '/__component/translations']
      );
      assert.strictEqual(
        calls.find(c => c.path === '/__component/templates').fn,
        ComponentController.templates
      );
      assert.strictEqual(
        calls.find(c => c.path === '/__component/component').fn,
        ComponentController.component
      );
      assert.strictEqual(
        calls.find(c => c.path === '/__component/translations').fn,
        ComponentController.translations
      );
    });

  });

});
