
const domain  = require('domain');

const config  = require('../config');
const logger  = require('../logger');
const mailer  = require('../mailer');

//
const getURL = function(req) {
  return [
    req.protocol,
    '://',
    req.headers['x-forwarded-host'] || req.get('host'),
    req.originalUrl
  ].join('');
};

//
const formatMessage = function(req, err) {
  const url     = getURL(req);

  const details = [
    '<td>URL:</td><td>' + req.method + ' ' + url + '</td>',
    '<td>req.body:</td><td>' + JSON.stringify(req.body) + '</td>',
    '<td>req.session:</td><td>' + JSON.stringify(req.session) + '</td>',
    '<td>Referer:</td><td>' + req.get('Referer') + '</td>',
    '<td>User-Agent:</td><td>' + req.headers['user-agent'] + '</td>'
  ];

  const message = '<h1>'  + url + '</h1>' +
                  '<pre>' + err.stack + '</pre>' +
                  '<table cellspacing="10"><tr>' + details.join('</tr><tr>') + '</tr></table>';
  return message;
};

// log and show error
const handle = function(err, req, res) {

  // uri error
  if (err instanceof URIError) {
    return res.status(404).render('errors/404');
  }

  logger.error(req.method + ' ' + getURL(req) + ' : ' + err);
  logger.error(err.stack);

  if (config.mailcrashto) {
    mailer.send('crash', {
      to:       config.mailcrashto,
      subject:  [ config.appname, 'Crash:', err ].join(' '),
      body:     formatMessage(req, err)
    })
  }
  
  if (!res._headerSent) {
    // show error
    if (config.env === 'production') {
      return res.status(500).render('errors/500');
    }

    //
    const stacktrace = [
      '<h1>', req.method, ': ', req.originalUrl, '</h1>',
      '<pre>', err.stack, '</pre>'
    ].join('');
    res.status(500).send(stacktrace);
  }

};

// init domain for error handling
module.exports.init = function(app) {
  return function(req, res, next) {
    const appDomain = domain.create();
    appDomain.add(req);
    appDomain.add(res);
    appDomain.on('error', function(err) {
      handle(err, req, res);
      gracefullyShutdown(app);
    });
    appDomain.run(next);
  };
};

// handle express error
module.exports.error = function(err, req, res, next) {
  handle(err, req, res);
};

//
module.exports.errorSQL = function(err) {
  console.log(err);
  logger.error(err);
  if (config.mailcrashto) {
    mailer.send('crash', {
      to:       config.mailcrashto,
      subject:  [ config.appname, 'SQL error:', err.code].join(' '),
      body:     '<table cellspacing="10"><tr>' +
        '<tr><td>code:</td><td>' + err.code + '</td></tr>' +
        '<tr><td>sqlMessage:</td><td>' + err.sqlMessage + '</td></tr>' +
        '<tr><td>sql:</td><td>' + err.sql + '</td></tr></table>',
    })
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
    app.server.close();

  } catch (err) {
    // oh well, not much we can do at this point.
    console.error('Error shutting down gracefully!', err.stack);
  }
}
