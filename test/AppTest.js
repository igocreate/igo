require('./init');

const assert = require('assert');
const config = require('../src/config');

const agent = require('../src/dev/test/agent');


describe('controllers', function() {

  //
  describe('/', function() {
    it('should return text', async () => {
      const res = await agent.get('/');
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body, 'Hello Igo');
    });
  });

  //
  describe('/error', function() {
    // error handling is disabled in test mode
    it.skip('should handle sync error', async () => {
      const res = await agent.get('/error');
      assert.strictEqual(res.statusCode, 500);
      assert(res.body.match(/missingfunction is not defined/));
    });
    
    // error handling is disabled in test mode
    it.skip('should handle async error', async () => {
      const res = await agent.get('/asyncerror');
      assert.strictEqual(res.statusCode, 500);
      assert(res.body.match(/missingfunction is not defined/));
    });
  });

  //
  describe('/template', function() {
    it('should render template', async () => {
      config.igodust.stream = false;
      const res = await agent.get('/template');
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body, 'Igo Dust OK');
    });

    it('should render template with streaming', async () => {
      config.igodust.stream = true;
      const res = await agent.get('/template');
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body, 'Igo Dust OK');
    });

    // error handling is disabled in test mode
    it.skip('should handle missing template error', async () => {
      const res = await agent.get('/missingtemplate');
      assert.strictEqual(res.statusCode, 500);
      assert(res.body.match(/Internal Server Error/));
    });
  });

  //
  describe('/notfound', function() {
    it('should handle 404 error', async () => {
      const res = await agent.get('/notfound');
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body, 'Not Found');
    });
  });

  
});


