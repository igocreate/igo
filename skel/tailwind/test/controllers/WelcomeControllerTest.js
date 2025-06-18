
require('igo').dev.test();

const assert = require('assert');

const agent = require('igo').dev.agent;



describe('controllers/WelcomeController', function() {

  //
  describe('/', function() {
    it('should show welcome page', async () => {
      const res = await agent.get('/');
      assert.strictEqual(res.statusCode, 200);
      assert(res.body.match(/running/));
    });
  });
});
