const app     = require('../../app');

//
const mockRequest = (options) => {
  const req = {};

  // Parse URL and query string
  let pathname = options.url;
  let query = options.query || {};

  if (options.url.includes('?')) {
    const [path, queryString] = options.url.split('?');
    pathname = path;
    if (!options.query) {
      const params = new URLSearchParams(queryString);
      query = {};
      for (const [key, value] of params) {
        query[key] = value;
      }
    }
  }

  req.hostname    = options.hostname || 'test';
  req.method      = options.method || 'GET';
  req.url         = options.url;
  req.originalUrl = options.url;
  req.path        = pathname;
  req.query       = query;
  req.params      = options.params  || {};
  req.cookies     = options.cookies || {};
  req.session     = options.session || {};
  req.body        = options.body    || {};
  req.headers     = options.headers || {};
  req.files       = options.files   || {};
  req.resume      = () => {};
  req.listeners   = () => { return []; };
  req.unpipe      = () => {};
  req.connection  = {};
  req.socket      = {
    destroy: () => {}
  };

  return req;
};

//
const mockResponse = () => {
  let resolveResponse;
  let timeoutId;

  const res = {
    body: '',
    headers: {},
    locals: {
      flash: {}
    }
  };

  const done = new Promise((resolve, reject) => {
    resolveResponse = (value) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      resolve(value);
    };

    // Timeout après 10 secondes
    timeoutId = setTimeout(() => {
      const error = new Error('Request timeout after 10s');
      res.error = error;
      res.statusCode = 408;
      reject(error);
    }, 10000);
  });

  res.getHeader = (name) => {
    return res.headers[name];
  };

  res.setHeader = (name, value) => {
    res.headers[name] = value;
  };

  res.redirect = (statusCode, redirectUrl) => {
    if (!Number.isInteger(statusCode)) {
      redirectUrl = statusCode;
      statusCode  = 302;
    }
    res.statusCode  = statusCode;
    res.redirectUrl = redirectUrl;
    resolveResponse(res);
  };

  res.removeHeader = () => {
    // ignore
  };

  res.write = (data) => {
    res.body += data;
  };

  res.send = (data) => {
    res.body = data;
    resolveResponse(res);
  };

  res.end = (chunk) => {
    if (chunk) {
      res.body += chunk;
    }
    resolveResponse(res);
  };

  return { res, done };
};

//
module.exports.send = async (url, options = {}) => {
  if (!url) {
    throw new Error('URL is required');
  }

  options.url = url;
  const req = mockRequest(options);
  const { res, done } = mockResponse();

  try {
    app.handle(req, res);
  } catch (error) {
    res.error = error;
    res.statusCode = 500;
    res.end();
  }

  return await done;
};

//
module.exports.get = async (url, options = {}) => {
  return await module.exports.send(url, { ...options, method: 'GET' });
};

//
module.exports.post = async (url, options = {}) => {
  return await module.exports.send(url, { ...options, method: 'POST' });
};

//
module.exports.put = async (url, options = {}) => {
  return await module.exports.send(url, { ...options, method: 'PUT' });
};

//
module.exports.patch = async (url, options = {}) => {
  return await module.exports.send(url, { ...options, method: 'PATCH' });
};

//
module.exports.delete = async (url, options = {}) => {
  return await module.exports.send(url, { ...options, method: 'DELETE' });
};
