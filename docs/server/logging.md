
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
{"service":"myapi","version":"1.4.0","environment":"qualif", …}
```

| Field | From | Default |
|---|---|---|
| `service` | `OTEL_SERVICE_NAME` | `name` of the project's `package.json` |
| `version` | `APP_VERSION` | `version` of the project's `package.json` |
| `environment` | `ENVIRONMENT` | `NODE_ENV` |

`service` and `environment` read the variables the OpenTelemetry
instrumentation reads, so a log line and the trace of the same request name the
same service and the same deployment. `environment` is the deployment's name,
not the run mode: a staging runs with `NODE_ENV=production`, and would
otherwise log as production. `APP_NAME` titles the crash emails and plays no
part here.

They are also `config.servicename`, `config.version` and `config.environment`.
Without them, a pooled log platform cannot tell one project — or one
environment — from another.

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
request (an uncaught exception or rejection, a CLI command), which has no line
to join.

An error with a `code` carries it: stable across occurrences where the message
names a table or a value, it is what errors are counted by. A failed query adds
the statement igo sent, as `sql` and `sql_params`, the same with MySQL and
PostgreSQL — the values in the clear, each one truncated:

```json
{"level":"error","message":"Error: Table 'app.folderz' doesn't exist",
 "method":"GET","path":"/folders/42","status":500,"duration_ms":12.4,
 "code":"ER_NO_SUCH_TABLE","sql":"SELECT * FROM folderz WHERE id = ?",
 "sql_params":"[42]","stack":"Error: Table … at async show (…)","trace_id":"4bf9…"}
```

The query itself logs nothing: an error the application catches is its to
handle, and one it lets through is logged once, by what it reaches.

`config.logrequests` takes `true`, `false`, or a **status floor**: `400`, the
default, keeps the errors and drops the successes. One line per request is the
largest item in a log bill, and once latency and error rate come from metrics
the successes teach little. It is a deployment setting, so `LOG_REQUESTS` sets
it from the environment like `LOG_FORMAT` does:

```sh
LOG_REQUESTS=true npm start    # every request, while no metrics are wired
```

Off in tests.

## Outgoing calls

The calls an application makes to its partners get the same line, with nothing
to write: igo finds the project's axios at startup and watches its default
instance and every instance created from it, and it wraps the global `fetch`.

```json
{"level":"warn","message":"http call","method":"POST","host":"api.partner.io",
 "path":"/api/tiers/import","status":422,"duration_ms":184.3,
 "body":"{\"siret\":\"123\",\"password\":\"[redacted]\"}",
 "response":"{\"errors\":[{\"code\":\"SIRET\",\"detail\":\"invalide\"}]}",
 "trace_id":"4bf92f35…"}
```

- `query` is on every line, redacted — a partner's API key often travels there.
- A refused call (4xx, 5xx) carries `body` and `response`, redacted and
  truncated like an inbound error. A form is parsed before redaction, so the
  `client_secret` of a token request is masked; a text that is not a document
  is kept as is; a file or a stream is left out. Headers are never logged.
- A call that got no answer — refused, reset, timed out — is an `error` line
  whose message is the cause, with its `code` (`ECONNREFUSED`, `ECONNABORTED`)
  and no `status`. A call the caller aborted is not logged.
- `trace_id` is the one of the request or the job that made the call.

`config.loghttpcalls` reads like `config.logrequests`, from `LOG_HTTP_CALLS`,
with the same default. A partner can be set apart by host, as the URL gives it
— with its port only when it is not the default one:

```sh
# every call to the accounting partner; the 404s of an identity API mean "unknown"
LOG_HTTP_CALLS_BY_HOST=api.partner.io=true,particulier.api.gouv.fr=500
```

Whatever the setting, a call that got no answer is logged, in tests too: that
line is the only trace of the failure.

An axios instance set to use `fetch` as its adapter gets two lines per call, one
from each.

A project importing axios as an ES module loads another copy than the one igo
finds, and hands its instance over itself:

```js
import axios from 'axios';
import { logHttpCalls } from '@igojs/server';

logHttpCalls(axios);
```

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
fields: `password`, `token`, `secret`, `cookie`, `authorization`, API keys, and
their French names. The default stops there, on purpose: igo cannot know which of
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
