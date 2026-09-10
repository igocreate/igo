
const winston     = require('winston');

const config = require('./config');

// Terminal-friendly: one readable line, colours, metadata appended.
const humanFormat = () => winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.splat(),
  winston.format.printf(info => {
    const { timestamp, level, message, trace_id, ...rest } = info;
    const id     = trace_id ? ` [${String(trace_id).slice(0, 8)}]` : '';
    const fields = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
    return `${timestamp} ${level}:${id} ${message}${fields}`;
  })
);

// Machine-readable: one JSON object per line, which is what log collectors
// ingest. Colour codes and dropped metadata make text logs unqueryable.
const jsonFormat = () => winston.format.combine(
  winston.format.timestamp(),
  winston.format.splat(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

//
const logger = winston.createLogger({
  level:      'info',
  format:     humanFormat(),
  transports: [
    new winston.transports.Console()
  ]
});

// Stamps every log emitted during a request with the id of that request, so
// its lines can be pulled together — and matched with what the client reports.
//
// The name is trace_id, the one OpenTelemetry uses: when instrumentation is on
// it has already stamped it, and when it is off igo fills the same field. One
// name for one value, whether the application is instrumented or not.
const withRequestId = winston.format((info) => {
  const requestId = module.exports.currentRequestId();
  if (requestId && !info.trace_id) {
    info.trace_id = requestId;
  }
  return info;
});

//
module.exports = logger;

// Set by the request logger; kept here so logger.js does not depend on the
// error handler, which already depends on config and mailer.
let currentRequestId = () => undefined;

module.exports.currentRequestId = (...args) => currentRequestId(...args);

module.exports.provideRequestId = (fn) => {
  currentRequestId = fn;
};

//
module.exports.init = () => {

  logger.level  = config.loglevel;

  // Once several projects and environments write to the same place, a log line
  // is only useful if it says where it comes from. Only in the machine-readable
  // format: in a terminal these three are constant and just add noise.
  logger.defaultMeta = config.logformat === 'json' ? {
    service:     config.appname,
    version:     config.version,
    environment: config.env,
  } : undefined;

  logger.format = winston.format.combine(
    withRequestId(),
    config.logformat === 'json' ? jsonFormat() : humanFormat()
  );

  logger.debug('Winston logger initialized');

};
