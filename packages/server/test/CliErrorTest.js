require('./init');

const assert = require('assert');
const errorhandler = require('@igojs/server/src/connect/errorhandler');

// A CLI command that fails prints one line and exits; the database errors name
// the server, since the usual cause is another MySQL listening on the port.
describe('CLI failures', function() {
  const { describeCliError } = errorhandler._test;

  it('should name the database server behind a MySQL error', () => {
    const err = Object.assign(new Error('Unknown database \'audit\''), { code: 'ER_BAD_DB_ERROR' });
    assert.match(describeCliError(err), /^MySQL [^:]+:\d+\/\w+: Unknown database 'audit'$/);
  });

  it('should pass any other error through', () => {
    assert.strictEqual(describeCliError(new Error('boom')), 'boom');
  });
});
