require('./init');

const assert  = require('assert');
const winston = require('winston');
const { Writable } = require('stream');

const config = require('@igojs/server').config;
const logger = require('@igojs/server').logger;

// Captures what a transport would actually write, which is the only way to
// tell a readable line from an ingestible JSON object.
const captureOutput = (fn, reconfigure) => {
  const lines  = [];
  const format = logger.format;
  const level  = logger.level;
  const transports = logger.transports.slice();

  logger.clear();
  logger.add(new winston.transports.Stream({
    stream: new Writable({
      write(chunk, encoding, callback) {
        lines.push(chunk.toString().trim());
        callback();
      },
    }),
  }));
  if (reconfigure) {
    reconfigure();
    lines.length = 0;
  }
  logger.level = 'info';

  try {
    fn();
  } finally {
    logger.clear();
    transports.forEach(t => logger.add(t));
    logger.format = format;
    logger.level  = level;
  }
  return lines;
};

// logger.init() emits a line of its own: run it while the transports are
// already swapped out, so it neither pollutes the console nor the capture.
const withFormat = (logformat, fn) => {
  const initial = config.logformat;
  config.logformat = logformat;
  try {
    return captureOutput(fn, () => logger.init());
  } finally {
    config.logformat = initial;
    captureOutput(() => {}, () => logger.init());
  }
};

describe('Logger', function() {

  describe('json format', function() {

    it('should emit one parseable object per line', () => {
      const [line] = withFormat('json', () => logger.info('hello'));
      const entry  = JSON.parse(line);
      assert.strictEqual(entry.message, 'hello');
      assert.strictEqual(entry.level, 'info');
      assert(entry.timestamp);
    });

    it('should keep metadata as fields, not drop them', () => {
      const [line] = withFormat('json', () => logger.info('done', { user_id: 42, folder_id: 7 }));
      const entry  = JSON.parse(line);
      assert.strictEqual(entry.user_id, 42);
      assert.strictEqual(entry.folder_id, 7);
    });

    it('should carry the stack of an error', () => {
      const [line] = withFormat('json', () => logger.error(new Error('boom')));
      const entry  = JSON.parse(line);
      assert.strictEqual(entry.message, 'boom');
      assert(entry.stack.includes('Error: boom'));
    });

    it('should say which service, version and environment a line comes from', () => {
      const [line] = withFormat('json', () => logger.info('hello'));
      const entry  = JSON.parse(line);
      assert.strictEqual(entry.environment, config.env);
      assert.strictEqual(entry.service, config.appname);
      assert.strictEqual(entry.version, config.version);
    });

    it('should not colour what a log collector reads', () => {
      const [line] = withFormat('json', () => logger.info('plain'));
      // eslint-disable-next-line no-control-regex
      assert(!/\[/.test(line), 'ANSI escape codes leaked into the JSON output');
    });
  });

  describe('human format', function() {

    it('should stay on one readable line', () => {
      const [line] = withFormat('human', () => logger.info('hello'));
      assert(line.includes('hello'));
      assert.throws(() => JSON.parse(line));
    });

    it('should append metadata rather than lose it', () => {
      const [line] = withFormat('human', () => logger.info('done', { user_id: 42 }));
      assert(line.includes('"user_id":42'));
    });

    it('should leave out the fields that are constant in a terminal', () => {
      const [line] = withFormat('human', () => logger.info('done'));
      assert(!line.includes('environment'), 'service/version/environment are json-only');
    });
  });
});
