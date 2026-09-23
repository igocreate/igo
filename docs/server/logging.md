
# Logging

Igo logs through [winston](https://github.com/winstonjs/winston). Two formats:
readable lines in a terminal, one JSON object per line in production — which is
what a log collector can actually query.

## Usage

```js
const { logger } = require('@igojs/server');

logger.info('folder submitted', { folder_id: folder.id, user_id: req.session.user_id });
logger.warn('quota nearly reached', { used: 92 });
logger.error(err);
```

The second argument becomes **fields**, not text. That is what makes a log
searchable: `folder_id = 42` is a query, `"folder 42 submitted"` is a substring
match.

## Format

| | Format | Why |
|---|---|---|
| dev, test | `human` | Coloured, one line, metadata appended |
| production | `json` | One object per line, ingested as-is |

```js
// app/config.js
module.exports.init = (config) => {
  config.logformat = 'json';    // or 'human'
};
```

`LOG_FORMAT` and `LOG_LEVEL` override it from the environment, which is handy
to reproduce production output locally:

```sh
LOG_FORMAT=json npm start
```

Errors keep their stack.

### Standing fields

In `json`, every line also carries where it comes from:

```json
{"service":"myapi","version":"1.4.0","environment":"production", …}
```

`service` and `version` default to the `name` and `version` of your project's
`package.json`; `APP_NAME` and `APP_VERSION` override them, as does setting
`config.appname` / `config.version` directly. Without them, a pooled log
platform cannot tell one project — or one environment — from another.

They are left out of the `human` format, where all three are constant.

## Request logs

Every request is logged once it completes:

```json
{"level":"info","message":"request","method":"GET","path":"/api/books",
 "status":200,"duration_ms":5.4,"trace_id":"4bf92f3577b34da6a3ce929d0e0e4736","timestamp":"…"}
```

The level follows the status: `error` at 5xx, `warn` at 4xx, `info` otherwise.
`query` and `params` are there whenever they are not empty, whatever the status:
what was asked is part of reading a line, and neither weighs much.

An error line also carries `body` and the `response` sent, redacted and
truncated — a diagnosis needs the shape of an import, not its content. A
successful line carries neither, which would multiply the volume for little.

These four are logged as **JSON strings**, not nested objects, so a collector
that flattens nested fields cannot scatter one document over `response_status`,
`response_title` and `response_type`.

### An error is one line, not two

When a request fails, the error lands on that same line: the message becomes
the error, and `stack` comes with it.

```json
{"level":"error","message":"Error: connection refused to 10.0.0.5:3306",
 "method":"POST","path":"/api/books","status":500,"duration_ms":7.2,
 "body":"{\"title\":\"Dune\"}",
 "response":"{\"type\":\"about:blank\",\"title\":\"Internal Server Error\",\"status\":500}",
 "stack":"Error: connection refused…","trace_id":"4bf92f35…"}
```

One incident, one line, whether the route answers JSON or renders a page. The
stack and the body used to sit on separate lines, so neither told the whole
story.

`message` carries the error rather than the response body, which a 500 in
production deliberately empties: what the client is told is not what the log
needs.

Two cases still get a line of their own — an error raised after the response
was sent, since the request line is already written, and an error outside any
request (`uncaughtException`, a CLI command), which has no line to join.

`config.logrequests` takes `true`, `false`, or a **status floor**: `400` keeps
the errors and drops the successes. One line per request is the largest item in
a log bill, and once latency and error rate come from metrics the successes
teach little. It is a deployment setting, so `LOG_REQUESTS` sets it from the
environment like `LOG_FORMAT` does:

```sh
LOG_REQUESTS=400 npm start    # production: errors only
```

Off in tests.

## Trace id

Each request has one identity, the W3C Trace Context trace id, exposed three
ways:

- **`req.traceId`** in a handler,
- **`traceresponse`** on the response — `00-<trace-id>-<span-id>-<flags>`, the
  way back that Trace Context Level 2 defines,
- **`trace_id`** on every log emitted during that request — including your own
  `logger.info()` calls, with nothing to pass along.

```js
exports.create = async (req, res) => {
  logger.info('creating a book', { title: req.body.title });
  // -> {"message":"creating a book","title":"…","trace_id":"4bf92f3577b34da6a3ce929d0e0e4736"}
};
```

That is what lets the lines of one request be pulled together, and a client
report be matched with what the server did: a front end can read
`traceresponse` and show the id next to the error.

An inbound `traceparent` is **reused** rather than replaced, so a request keeps
one identity across a proxy or between services. The header is validated first:
a malformed or duplicated one is ignored.

When an OpenTelemetry SDK is registered, the ids are those of the active span,
and the flags say whether the trace was sampled. Without one, igo mints a trace
id and a span id of the same shape, with flags `00`: the day instrumentation
arrives, nothing changes in the code, the logs or the clients.

## Sensitive fields

Anything igo logs from a request — the error context above, the crash emails —
goes through `redact()`, which replaces the values of the usual credential
fields: `password`, `token`, `secret`, `cookie`, `authorization`, and their
French names. The default stops there, on purpose: igo cannot know which of
your domain's fields are sensitive. Extend it:

```js
// app/config.js
const { redact } = require('@igojs/server');

module.exports.init = (config) => {
  config.sensitiveKeys = new RegExp(`${redact.DEFAULT_SENSITIVE_KEYS.source}|iban|numero.?secu`, 'i');
};
```

`redact()` is exported for your own logging: `logger.info('payload', redact(req.body))`.

## Sending logs elsewhere

The JSON format is designed to be read by a collector — Loki, Datadog, or
anything that ingests JSON lines. Nothing to configure in igo: point the
collector at the process output.

To add a destination, winston transports work as usual:

```js
// anywhere at startup — logger is a plain winston logger
const { logger } = require('@igojs/server');
logger.add(new winston.transports.File({ filename: 'logs/app.log' }));
```
