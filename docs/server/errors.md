
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

## Special Cases

| Error type | Response | Email sent? |
|------------|----------|-------------|
| `URIError` (malformed URL) | 404 | No |
| `SyntaxError` (invalid JSON) | 500 | No |
| Other errors | 500 | Yes |

## Crash Emails

Configure a recipient for error notification emails:

```js
// app/config.js
config.mailer.crashemailto = 'admin@example.com';
```

The email includes: error message, stack trace, request context (method, URL, user-agent, body, session).

## Email Throttling

To prevent spam during crash loops, emails are throttled per error type:

- **Max 3 emails** per unique error within 1 minute
- After 3 emails, the error is **blocked for 5 minutes**
- A final `[THROTTLED]` alert is sent before blocking
- Different error types are tracked independently

Throttle state is persisted in a temp file to survive restarts.
