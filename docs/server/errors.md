
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

Configure one or more recipients for error notification emails:

```js
// app/config.js
module.exports.init = (config) => {
  config.mailcrashto = 'admin@example.com';
  // or, for several recipients:
  config.mailcrashto = ['admin@example.com', 'ops@example.com'];
};
```

The email includes: error message, stack trace, request context (method, URL, user-agent, body, session).

## Email Throttling

To prevent spam during crash loops, emails are throttled per error type:

- **Max 3 emails** per unique error within 1 minute
- After 3 emails, the error is **blocked for 5 minutes**
- A final `[THROTTLED]` alert is sent before blocking
- Different error types are tracked independently

Throttle state is persisted in a temp file to survive restarts.
