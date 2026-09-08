
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
 "status":200,"duration_ms":5.4,"request_id":"c253246c-…","timestamp":"…"}
```

The level follows the status: `error` at 5xx, `warn` at 4xx, `info` otherwise.

```js
config.logrequests = false;   // silence it (already off in tests)
```

## Request id

Each request gets an id, exposed three ways:

- **`req.id`** in a handler,
- **`X-Request-Id`** on the response,
- **`request_id`** on every log emitted during that request — including your own
  `logger.info()` calls, with nothing to pass along.

```js
exports.create = async (req, res) => {
  logger.info('creating a book', { title: req.body.title });
  // -> {"message":"creating a book","title":"…","request_id":"c253246c-…"}
};
```

That is what lets the lines of one request be pulled together, and a client
report be matched with what the server did.

An inbound `X-Request-Id` or `X-Correlation-Id` is **reused** rather than
replaced, so a request keeps one id across a proxy or between services. A front
end that sends the id it generated can then point at the exact server-side
request behind an error it saw.

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
