
# Running in Production

## Starting the App

```bash
export NODE_ENV=production
npm install --production
node app.js
```

Use a process manager like [PM2](https://pm2.keymetrics.io/) to keep your app running and restart on crashes:

```bash
pm2 start app.js --name myproject
```

## Configuration

In production, the `.env` file is **not loaded**. Environment variables must be set in the system environment (shell, Docker, PM2 ecosystem file, etc.).

An environment-specific config file `app/config-production.js` is loaded on top of the base `app/config.js`:

```js
// app/config-production.js
module.exports = (config) => {
  config.cache.redis.db = 1;
};
```

### Production Defaults

| Setting | Value |
|---------|-------|
| View caching | Enabled |
| Static file cache | 1 year (`max-age`) |
| DB connection pool | 10 connections |
| Gzip compression | Enabled (>1KB) |
| `x-powered-by` header | Disabled |

## Error Handling

Igo catches errors at three levels:

1. **Express request errors** — logged, error page returned (500)
2. **Unhandled promise rejections** — caught if within a request context
3. **Uncaught exceptions** — logged, then `process.exit(1)` after 1s (lets PM2 restart)

`URIError` (malformed URLs) returns a 404 silently. `SyntaxError` (bad JSON) returns a 500 without notification.

### Error Emails

Errors can be sent by email to the admin. Email throttling prevents spam during crash loops:
- Max 3 emails per unique error within 1 minute
- After 3 emails, the error is silenced for 5 minutes

Configure the crash email recipient:

```js
// app/config.js
config.mailer.crashemailto = 'admin@example.com';
```

## Logging

Igo uses [Winston](https://github.com/winstonjs/winston) for logging. The log level is controlled via `LOG_LEVEL`:

```bash
export LOG_LEVEL=warn
```

Output format: `${timestamp} ${level}: ${message}`

## Email

Igo integrates [Nodemailer](https://nodemailer.com/) with MJML and Dust templates.

Templates are located in `views/emails/` as `.mjml` or `.dust` files:

```js
const { mailer } = require('@igojs/server');

await mailer.send('welcome', {
  to:   'user@example.com',
  name: 'John',
});
```

This renders `views/emails/welcome.mjml` (or `.dust`), translates the subject via i18next key `emails.welcome.subject`, and sends the email.

Configure SMTP via environment variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`.

## Assets

In production, Webpack outputs minified bundles with content-hash filenames to `public/dist/`. The manifest file `webpack-assets.json` maps entry names to their hashed filenames.

Build assets before deploying:

```bash
npx webpack --mode production
```
