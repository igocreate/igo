
require('igo').dev.test();

const assert = require('assert');

const agent = require('igo').dev.agent;



describe('controllers/WelcomeController', function() {

  //
  describe('/', function() {
    it('should show welcome page', function(done) {
      agent.get('/', function(err, res) {
        assert.strictEqual(res.statusCode, 200);
        assert(res.body.match(/running/));
        done();
      });
    });
  });
});
