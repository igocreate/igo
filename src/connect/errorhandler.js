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
 * Uses AsyncLocalStorage to maintain request context across async operations.
 */

const { AsyncLocalStorage } = require('async_hooks');

const config  = require('../config');
const logger  = require('../logger');
const mailer  = require('../mailer');

const asyncLocalStorage = new AsyncLocalStorage();

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

const sendCrashEmail = (subject, body) => {
  if (config.mailcrashto) {
    mailer.send('crash', {
      to: config.mailcrashto,
      subject: `[${config.appname}] ${subject}`,
      body
    });
  }
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
    sendCrashEmail(`Crash (response sent): ${err}`, formatMessage(req, err));
    return;
  }

  // Log error
  logger.error(`${req.method} ${getURL(req)} : ${err}`);
  logger.error(err.stack);

  // Send email notification
  sendCrashEmail(`Crash: ${err}`, formatMessage(req, err));

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
    sendCrashEmail(`Uncaught exception: ${err}`, `<pre>${err.stack}</pre>`);
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

    sendCrashEmail(`SQL error: ${err.code}`, body);
  }
};
