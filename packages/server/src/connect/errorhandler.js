/**
 * Error Handler
 *
 * This module handles all errors in the Igo framework:
 *
 * 1. Express errors (via module.exports.error middleware)
 *    - Logs error and sends email notification
 *    - Returns 500 error page to client
 *    - Server continues running
 *
 * 2. Unhandled promise rejections (process.on('unhandledRejection'))
 *    - If request context available: same as Express errors
 *    - If no context: logs and throws (will trigger uncaughtException)
 *    - Server continues running
 *
 * 3. Uncaught exceptions (process.on('uncaughtException'))
 *    - Logs error and sends email notification
 *    - Forces process.exit(1) after 1 second
 *    - Process manager (PM2, systemd) will restart the server
 *
 * Special cases:
 * - URIError (malformed URL): returns 404
 * - SyntaxError (invalid JSON): returns 500
 * - Both are client errors and don't trigger email notifications
 *
 * Email throttling:
 * - To prevent email spam during crash loops, emails are throttled per error type
 * - If the same error triggers 3+ emails within 1 minute, that error is blocked for 5 minutes
 * - Different errors are tracked independently (a new error type will still be sent)
 * - Throttle state is persisted in a temp file to survive app restarts
 *
 * Uses AsyncLocalStorage to maintain request context across async operations.
 */

const { AsyncLocalStorage } = require('async_hooks');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const config  = require('../config');
const logger  = require('../logger');
const mailer  = require('../mailer');

const asyncLocalStorage = new AsyncLocalStorage();

// Throttle configuration
const THROTTLE_FILE    = path.join(os.tmpdir(), 'igo-crash-throttle.json');
const THROTTLE_WINDOW  = 60 * 1000;       // 1 minute
const THROTTLE_LIMIT   = 3;               // max emails per error in window
const BLOCK_DURATION   = 5 * 60 * 1000;   // 5 minutes

// Load throttle data from file
const loadThrottleData = () => {
  try {
    if (fs.existsSync(THROTTLE_FILE)) {
      return JSON.parse(fs.readFileSync(THROTTLE_FILE, 'utf8'));
    }
  } catch (e) {
    // Ignore read errors, start fresh
  }
  return { emails: [], blocked: {} };
};

// Save throttle data to file
const saveThrottleData = (data) => {
  try {
    fs.writeFileSync(THROTTLE_FILE, JSON.stringify(data), 'utf8');
  } catch (e) {
    // Ignore write errors
  }
};

// Check if email should be throttled, returns { throttled: boolean, shouldAlert: boolean }
const checkThrottle = (errorKey) => {
  const now = Date.now();
  const data = loadThrottleData();

  // Clean old entries (outside throttle window)
  data.emails = data.emails.filter(e => now - e.ts < THROTTLE_WINDOW);

  // Clean expired blocks
  for (const key in data.blocked) {
    if (data.blocked[key] < now) {
      delete data.blocked[key];
    }
  }

  // Check if this error is currently blocked
  if (data.blocked[errorKey] && data.blocked[errorKey] > now) {
    saveThrottleData(data);
    return { throttled: true, shouldAlert: false };
  }

  // Count recent emails for this error
  const recentCount = data.emails.filter(e => e.error === errorKey).length;

  if (recentCount >= THROTTLE_LIMIT - 1) {
    // This would be the Nth email, block this error and send alert
    data.blocked[errorKey] = now + BLOCK_DURATION;
    data.emails.push({ ts: now, error: errorKey });
    saveThrottleData(data);
    return { throttled: false, shouldAlert: true };
  }

  // Allow email, record it
  data.emails.push({ ts: now, error: errorKey });
  saveThrottleData(data);
  return { throttled: false, shouldAlert: false };
};

const getURL = (req) => {
  const protocol  = req.protocol || 'http';
  const host      = req.headers['x-forwarded-host'] || (req.get ? req.get('host') : req.headers.host) || 'localhost';
  const url       = req.originalUrl || req.url || '/';
  return `${protocol}://${host}${url}`;
};

const formatMessage = (req, err) => {
  const url = getURL(req);
  return `
    <h1>${url}</h1>
    <pre>${err.stack}</pre>
    <table cellspacing="10">
      <tr><td>URL:</td><td>${req.method} ${url}</td></tr>
      <tr><td>User-Agent:</td><td>${req.headers['user-agent']}</td></tr>
      <tr><td>Referer:</td><td>${req.get ? req.get('Referer') : ''}</td></tr>
      <tr><td>req.body:</td><td>${JSON.stringify(req.body)}</td></tr>
      <tr><td>req.session:</td><td>${JSON.stringify(req.session)}</td></tr>
      <tr><td>req.headers:</td><td>${JSON.stringify(req.headers)}</td></tr>
    </table>
  `;
};

const sendCrashEmail = (subject, body, errorKey) => {
  if (!config.mailcrashto) {
    return;
  }

  // Use error key for throttling (fallback to subject if not provided)
  const key = errorKey || subject;
  const { throttled, shouldAlert } = checkThrottle(key);

  if (throttled) {
    logger.warn(`Crash email throttled (error repeated too often): ${key}`);
    return;
  }

  if (shouldAlert) {
    // Send alert that this error is now being throttled
    mailer.send('crash', {
      to: config.mailcrashto,
      subject: `[${config.appname}] ${subject} [THROTTLED]`,
      body: body + `
        <hr>
        <p><strong>⚠️ Cette erreur a été répétée ${THROTTLE_LIMIT} fois en moins d'une minute.</strong></p>
        <p>Les notifications pour cette erreur sont suspendues pendant ${BLOCK_DURATION / 60000} minutes.</p>
      `
    });
    return;
  }

  mailer.send('crash', {
    to: config.mailcrashto,
    subject: `[${config.appname}] ${subject}`,
    body
  });
};

// Handle errors that occur during HTTP requests
const handle = (err, req, res) => {
  // Client errors - don't send emails
  if (err instanceof URIError) {
    if (!res.headersSent) {
      res.status(404).render('errors/404');
    }
    return;
  }

  if (err instanceof SyntaxError) {
    if (!res.headersSent) {
      res.status(500).render('errors/500');
    }
    return;
  }

  // Check if response already sent
  if (res.headersSent) {
    // Response already sent, can only log
    logger.error(`${req.method} ${getURL(req)} : ${err} (response already sent)`);
    logger.error(err.stack);
    sendCrashEmail(`Crash (response sent): ${err}`, formatMessage(req, err), String(err));
    return;
  }

  // Log error
  logger.error(`${req.method} ${getURL(req)} : ${err}`);
  logger.error(err.stack);

  // Send email notification
  sendCrashEmail(`Crash: ${err}`, formatMessage(req, err), String(err));

  // Send response
  if (config.env === 'production') {
    return res.status(500).render('errors/500');
  }

  const stacktrace = `
    <h1>${req.method}: ${req.originalUrl}</h1>
    <pre>${err.stack}</pre>
  `;
  res.status(500).send(stacktrace);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  const context = asyncLocalStorage.getStore();

  if (context && context.req && context.res) {
    // We have a request context, handle it gracefully
    handle(err, context.req, context.res);
  } else {
    // No request context, just log and throw
    logger.error('Unhandled promise rejection outside of request context:', err);
    throw err;
  }
});

// Handle uncaught exceptions - log, send email, then exit
process.on('uncaughtException', (err) => {
  const context = asyncLocalStorage.getStore();

  if (context && context.req && context.res) {
    handle(err, context.req, context.res);
  } else {
    logger.error('Uncaught exception outside of request context:', err);
    logger.error(err.stack);
    sendCrashEmail(`Uncaught exception: ${err}`, `<pre>${err.stack}</pre>`, String(err));
  }

  // Exit after a short delay to allow email to be sent
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Initialize AsyncLocalStorage context for each request
module.exports.initContext = (app) => {
  return (req, res, next) => {
    const store = { req, res, app };
    asyncLocalStorage.run(store, () => {
      next();
    });
  };
};

// Get current request context
module.exports.getContext = () => {
  return asyncLocalStorage.getStore();
};

// Express error handler middleware
module.exports.error = (err, req, res, next) => {
  handle(err, req, res, next);
};

// SQL error handler (called from database layer)
module.exports.errorSQL = (err) => {
  logger.error(err);

  if (config.mailcrashto) {
    let body = '<table cellspacing="10">';
    body += `<tr><td>code:</td><td>${err.code}</td></tr>`;

    if (err.sqlMessage) {
      body += `<tr><td>sqlMessage:</td><td>${err.sqlMessage}</td></tr>`;
    } else {
      body += `<tr><td colspan="2">${String(err)}</td></tr>`;
    }

    if (err.sql) {
      body += `<tr><td>sql:</td><td>${err.sql}</td></tr>`;
    }

    body += '</table>';

    sendCrashEmail(`SQL error: ${err.code}`, body, `SQL:${err.code}`);
  }
};

// Exposed for testing
module.exports._test = {
  checkThrottle,
  loadThrottleData,
  saveThrottleData,
  THROTTLE_FILE,
  THROTTLE_WINDOW,
  THROTTLE_LIMIT,
  BLOCK_DURATION
};
