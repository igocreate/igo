require('./init');

const assert = require('assert');

const mailer = require('../src/mailer');


describe('mailer', function() {

  //
  describe('getHtml', function() {

    it('should return data.body', async () => {
      const html = await mailer.getHtml('test', { body: 'Hello Igo' });
      assert.strictEqual(html, 'Hello Igo');
    });

    it('should render dust template', async () => {
      const html = await mailer.getHtml('test1', { world: 'Igo' });
      assert.strictEqual(html, 'Hello Igo');
    });

    it('should render mjml template', async () => {
      const html = await mailer.getHtml('test2', { world: 'Igo' });
      assert(html.startsWith('<!doctype html>'));
    });


  });

});
