
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

// Stamps every log emitted during a request with its trace id, so the lines of
// one request can be pulled together — and matched with what the client reports.
// When the OpenTelemetry winston instrumentation is on, it has already set the
// field; igo only fills it when nothing else did.
const withTraceId = winston.format((info) => {
  const traceId = module.exports.currentTraceId();
  if (traceId && !info.trace_id) {
    info.trace_id = traceId;
  }
  return info;
});

//
module.exports = logger;

// Provided by the request logger, which owns the per-request storage; kept as
// an injection so logger.js depends on nothing that depends on it.
let currentTraceId = () => undefined;

module.exports.currentTraceId = () => currentTraceId();

module.exports.provideTraceId = (fn) => {
  currentTraceId = fn;
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
    withTraceId(),
    config.logformat === 'json' ? jsonFormat() : humanFormat()
  );

  logger.debug('Winston logger initialized');

};
