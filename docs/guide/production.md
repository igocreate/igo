
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
module.exports.init = (config) => {
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

Configure the crash email recipient (string or array):

```js
// app/config.js
config.mailcrashto = 'admin@example.com';
// or: config.mailcrashto = ['admin@example.com', 'ops@example.com'];
```

## Security Headers

Every response carries the headers a penetration test asks for:
`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy: camera=(), microphone=(), geolocation=()`, and in
production over HTTPS `Strict-Transport-Security: max-age=63072000; includeSubDomains`.
API responses add `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`
and `Cache-Control: no-store`: JSON never executes, and may carry personal data.

No Content-Security-Policy is set on the pages: a working one is made of your
own exceptions — fonts, CDNs, third-party APIs — so it is yours to declare.
Each header is a key of `config.security`; `false` drops it, and
`config.security = false` drops them all.

```js
// app/config.js
module.exports.init = (config) => {
  config.security.csp  = "default-src 'self'; img-src 'self' data:; font-src https://fonts.gstatic.com";
  config.security.hsts = 'max-age=63072000; includeSubDomains; preload';
  config.security.permissionsPolicy = 'camera=(), microphone=()';   // this app geolocates
};
```

The `fullstack` skeleton's SPA is not served by igo: its policy is a `<meta>`
tag written by `vite.config.ts`, and `frame-ancestors` is nginx's.

## Health Checks

Two routes answer what an orchestrator asks, and nothing more:

| Route | Answers |
|-------|---------|
| `GET /health` | Liveness: the process runs. No dependency is touched. |
| `GET /health/ready` | Readiness: the database, the cache and the disk answer. |

Readiness sends `503` when one of them does not, which is what takes an
instance out of a load balancer — the body is for whoever reads it, the status
code is what nginx, HAProxy and Kubernetes act on.

```json
{
  "status": "DOWN",
  "components": {
    "db":    { "status": "DOWN" },
    "cache": { "status": "UP" },
    "disk":  { "status": "UP" }
  }
}
```

The reason a probe failed stays in the logs: `/health/ready` is reachable by
whoever can reach the service, and a connection error names hosts and ports.

```js
// app/config.js
module.exports.init = (config) => {
  config.health.disk    = 200 * 1024 * 1024;  // this app receives large uploads
  config.health.cache   = false;              // no redis here
  config.health.timeout = 300;
};
```

`config.health = false` drops both routes. Neither appears in the request log,
and the `fullstack` skeleton's Alloy configuration drops them from the metrics
too: probed every few seconds, they would otherwise be most of the measured
traffic.

CPU and memory are deliberately not probed. A saturated CPU is often an
instance doing its job, and taking it out of rotation would spread the load
onto the others — they belong to alerting, where a trend is read, not to a
probe that decides in isolation.

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
