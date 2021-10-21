
const domain  = require('domain');

const config  = require('../config');
const logger  = require('../logger');
const mailer  = require('../mailer');

//
const getURL = (req) => {
  return [
    req.protocol,
    '://',
    req.headers['x-forwarded-host'] || req.get('host'),
    req.originalUrl
  ].join('');
};

//
const formatMessage = (req, err) => {
  const url = getURL(req);
  const message = `
    <h1>${url}</h1>
    <pre>${err.stack}</pre>
    <table cellspacing="10">
      <tr><td>URL:</td><td>${req.method} ${url}</td></tr>
      <tr><td>req.body:</td><td>${JSON.stringify(req.body)}</td></tr>
      <tr><td>req.session:</td><td>${JSON.stringify(req.session)}</td></tr>
      <tr><td>Referer:</td><td>${req.get('Referer')}</td></tr>
      <tr><td>User-Agent:</td><td>${req.headers['user-agent']}</td></tr>
    </table>
  `;
  return message;
};

// log and show error
const handle = (err, req, res) => {

  // uri error
  if (err instanceof URIError) {
    return res.status(404).render('errors/404');
  }

  // Syntax error (json format)
  if (err instanceof SyntaxError) {
    return res.status(500).render('errors/500');
  }

  logger.error(`${req.method} ${getURL(req)} : ${err}`);
  logger.error(err.stack);

  if (config.mailcrashto) {
    mailer.send('crash', {
      to:       config.mailcrashto,
      subject:  `[${config.appname}] Crash: ${err}`,
      body:     formatMessage(req, err)
    });
  }
  
  if (!res._headerSent) {
    // show error
    if (config.env === 'production') {
      return res.status(500).render('errors/500');
    }

    //
    const stacktrace = `
      <h1>${req.method}: ${req.originalUrl}</h1>
      <pre>${err.stack}</pre>
    `;
    res.status(500).send(stacktrace);
  }

};

// init domain for error handling
module.exports.initDomain = (app) => {
  return (req, res, next) => {
    const appDomain = domain.create();
    appDomain.add(req);
    appDomain.add(res);
    appDomain.on('error', (err) => {
      handle(err, req, res);
      gracefullyShutdown(app);
    });
    appDomain.run(next);
  };
};

// handle express error
module.exports.error = (err, req, res, next) => {
  handle(err, req, res, next);
};

//
module.exports.errorSQL = function(err) {
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

    mailer.send('crash', {
      to:       config.mailcrashto,
      subject:  `[${config.appname}] SQL error: ${err.code}`,
      body
    });
  }
};

// https://nodejs.org/api/domain.html
const gracefullyShutdown = function(app) {

  try {
    // make sure we close down within N seconds
    const killtimer = setTimeout(() => {
      process.exit(1);
    }, 3000);
    // But don't keep the process open just for that!
    killtimer.unref();

    // stop taking new requests.
    if (app.server) {
      app.server.close();
    }

  } catch (err) {
    // oh well, not much we can do at this point.
    console.error('Error shutting down gracefully!', err.stack);
  }
};
