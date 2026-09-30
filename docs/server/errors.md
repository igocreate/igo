
# Error Handling

Igo.js catches errors at three levels to keep your application running.

## Express Request Errors

Errors thrown in route handlers are caught, logged, and a 500 page is returned:

```js
app.get('/api/data', async (req, res) => {
  const data = await riskyOperation(); // If this throws, error handler catches it
  res.json(data);
});
```

## Unhandled Promise Rejections

If a promise rejects without a catch and the error happens within a request context, it's handled like an Express error. Otherwise, it's logged and re-thrown.

## Uncaught Exceptions

Fatal errors that escape all handlers are logged, an email is sent, and the process exits after 1 second. Use a process manager like PM2 to restart automatically.

Node gives no guarantee about the state of a process that reached this point — even when the request was answered, a stream or a connection may be left half-closed — so it always restarts. An error in an async route never gets here: a rejected promise is handled like an Express error.

### Flushing telemetry before the exit

Tracing exporters send spans in batches, every few seconds: those of the request that crashed are still buffered when the process exits, and they are the ones worth keeping. `config.onCrash` runs within the second before the exit:

```js
// app/config.js
module.exports.init = (config) => {
  config.onCrash = async () => {
    await stopTelemetry();
  };
};
```

It is not the [ordered shutdown](./shutdown.md): after an uncaught exception, waiting for the requests in flight or for a pool to drain may never return. Flush exporters here, nothing else. `config.onShutdown` stays for the signals.

- It runs once the failed request's response is flushed — its span only ends then.
- The second is a ceiling shared with the crash email, not extended: a callback still running is cut short.
- A rejection is logged, and the process exits anyway.

Outside a request — a cron started without `await` — the job's own span never ended, and an open span is never exported: only its finished children, such as the queries it ran, are saved.

## Special Cases

| Error type | Response | Email sent? |
|------------|----------|-------------|
| `URIError` (malformed URL) | 404 | No |
| `SyntaxError` (invalid JSON) | 500, or 400 on an API request | No |
| Other errors | 500 | Yes |

## API Requests

A request under `config.api.prefix` (`/api` by default), or one whose `Accept`
header asks for JSON, never receives a rendered page. Errors come back as
[RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) problem documents — 404s and
validation failures included. See [JSON APIs](./api).

```json
{ "type": "about:blank", "title": "Not Found", "status": 404 }
```

Crash emails are unaffected: only the response format changes.

## Crash Emails

One email per incident, sent to `MAIL_CRASH_TO` — one address, or several
separated by commas. A deployment setting: emptied on an environment whose
Grafana alerts took over, it stops the emails without a release.

```sh
MAIL_CRASH_TO=admin@example.com,ops@example.com
```

`config.mailcrashto` still takes a string or an array, and wins over the
variable when a project sets it in its config.

The subject says what happened, the sender says where:

| Subject | When | The process… |
|---|---|---|
| `Error 500: <error>` | a request failed | keeps serving |
| `Error after response: <error>` | a request failed after it was answered | keeps serving |
| `Crash: <error>` | an uncaught exception or rejection | restarts |

The email includes: error message, stack trace, request context (method, URL,
user-agent, body, session). A failed query sends no email of its own: it is the
error of the request, or of the process, that let it through.

## Email Throttling

To prevent spam during crash loops, emails are throttled per error type:

- **Max 3 emails** per unique error within 1 minute
- After 3 emails, the error is **blocked for 5 minutes**
- A final alert, its subject ending in `(repeated, paused 5 min)`, is sent before blocking
- Different error types are tracked independently

Throttle state is persisted in a temp file to survive restarts.
