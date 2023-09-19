require('./init');

const assert = require('assert');

const mailer = require('../src/mailer');


describe('mailer', function() {

  //
  describe('getHtml', function() {

    it('should return data.body', (done) => {
      const html = mailer.getHtml('test', { body: 'Hello Igo' });
      assert.strictEqual(html, 'Hello Igo');
      done();
    });

    it('should render dust template', (done) => {
      const html = mailer.getHtml('test1', { world: 'Igo' });
      assert.strictEqual(html, 'Hello Igo');
      done();
    });

    it('should render mjml template', (done) => {
      const html = mailer.getHtml('test2', { world: 'Igo' });
      assert(html.startsWith('<!doctype html>'));
      done();
    });


  });

});
