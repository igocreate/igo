

const _       = require('lodash');
const http    = require('http');

const cheerio = require('cheerio');

const url     = require('url');

const app     = require('../../app');

//
const mockRequest = function(options) {
  const req = {};

  req.hostname    = options.hostname || 'test';
  req.method      = options.method || 'GET';
  req.url         = options.url;
  req.originalUrl = options.url;
  req.path        = url.parse(options.url).pathname;
  req.query       = options.query;
  req.params      = options.params  || {};
  req.cookies     = options.cookies || {};
  req.session     = options.session || {};
  req.body        = options.body    || {};
  req.headers     = options.headers || {};
  req.files       = options.files   || {};
  req.resume      = function() {};
  req.listeners   = function() { return []; };
  req.unpipe      = function() {};
  req.connection  = {};
  req.socket      = {
    destroy: () => {}
  };

  return req;
};

//
const mockResponse = function(callback, req) {

  const res = {
    body: '',
    headers: {},
    _headers: {},
    _headerNames: {},
    locals: {
      flash: {}
    }
  };

  res.getHeader = function(name) {
    return res.headers[name];
  };

  res.setHeader = function(name, value) {
    res.headers[name] = value;
  };

  // http hacks
  // console.dir(http.OutgoingMessage.prototype.end.toString());
  http.OutgoingMessage.prototype.setHeader = res.setHeader;
  http.OutgoingMessage.prototype._writeRaw = function _writeRaw(data, encoding, callback) {
    res.send(data, encoding, callback);
  };
  http.OutgoingMessage.prototype.end = function end(chunk) {
    res.send(chunk);
  };

  res.redirect = function(statusCode, redirectUrl) {
    if (!_.isInteger(statusCode)) {
      redirectUrl = statusCode;
      statusCode  = 302;
    }
    res.statusCode  = statusCode;
    res.redirectUrl = redirectUrl;
    callback(null, res, req);
  };

  res.removeHeader = function() {
    // ignore
  };

  res.write = function(data) {
    res.body += data;
  };

  res.send = function(data) {
    res.body = data;
    callback(null, res, req);
  };

  res.end = function() {
    callback(null, res, req);
  };

  res.$ = (...args) => {
    if (!res._cached_$) {
      res._cached_$ = cheerio.load(res.body);
    }
    return res._cached_$(...args);
  };

  return res;
};

//
module.exports.send = (url, options={}, callback) => {
  options.url = url;
  const req = mockRequest(options);
  const res = mockResponse(callback, req);
  app.handle(req, res);
};

//
module.exports.get = (url, options={}, callback) => {
  if (_.isFunction(options)) {
    callback  = options;
    options   = {};
  }
  options.method = 'GET';
  
  if (callback) {
    return module.exports.send(url, options, callback);
  }
  return new Promise((resolve, reject) => {
    module.exports.send(url, options, (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
};

//
module.exports.post = (url, options={}, callback) => {
  if (_.isFunction(options)) {
    callback  = options;
    options   = {};
  }
  options.method = 'POST';

  if (callback) {
    return module.exports.send(url, options, callback);
  }
  return new Promise((resolve, reject) => {
    module.exports.send(url, options, (err, res) => {
      err ? reject(err) : resolve(res);
    });
  });
};
