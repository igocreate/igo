require('./init');

const assert = require('assert');

const agent = require('../src/dev/test/agent');


describe('controllers', function() {

  //
  describe('/', function() {
    it('should return text', (done) => {
      agent.get('/', (err, res) => {
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.body, 'Hello Igo');
        done();
      });
    });
  });

  //
  describe('/error', function() {
    // error handling is disabled in test mode
    it.skip('should handle sync error', (done) => {
      agent.get('/error', (err, res) => {
        assert.strictEqual(res.statusCode, 500);
        assert(res.body.match(/missingfunction is not defined/));
        done();
      });
    });
    
    // error handling is disabled in test mode
    it.skip('should handle async error', (done) => {
      agent.get('/asyncerror', (err, res) => {
        assert.strictEqual(res.statusCode, 500);
        assert(res.body.match(/missingfunction is not defined/));
        done();
      });
    });
  });

  //
  describe('/template', function() {
    it('should render template', (done) => {
      agent.get('/template', (err, res) => {
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.body, 'Igo Dust OK');
        done();
      });
    });

    // error handling is disabled in test mode
    it.skip('should handle missing template error', (done) => {
      agent.get('/missingtemplate', (err, res) => {
        assert.strictEqual(res.statusCode, 500);
        assert(res.body.match(/Internal Server Error/));
        done();
      });
    });
  });

  //
  describe('/notfound', function() {
    it('should handle 404 error', (done) => {
      agent.get('/notfound', (err, res) => {
        assert.strictEqual(res.statusCode, 404);
        assert.strictEqual(res.body, 'Not Found');
        done();
      });
    });
  });
  
});


