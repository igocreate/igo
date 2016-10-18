
'use strict';

require('igo').dev.test();

var assert = require('assert');

var agent = require('igo').dev.agent;



describe('controllers/WelcomeController', function() {

  //
  describe('/', function() {
    it('should show welcome page', function(done) {
      agent.get('/', function(err, res) {
        assert.equal(res.statusCode, 200);
        assert(res.body.match(/running/));
        done();
      });
    });
  });
});
