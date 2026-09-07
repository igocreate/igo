
const config = require('../config');

const CONTENT_TYPE = 'application/problem+json';

const TITLES = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  422: 'Unprocessable Content',
  500: 'Internal Server Error',
};

// A request is served as JSON when it targets the API prefix, or when the
// client asked for JSON and cannot render a dust page anyway.
const isApiRequest = (req) => {
  const prefix = config.api?.prefix;
  const path   = req.path || req.url || '';
  if (prefix && (path === prefix || path.startsWith(prefix + '/'))) {
    return true;
  }
  return !!req.headers?.accept?.includes('application/json');
};

// RFC 9457 Problem Details
const problem = (status, { title, detail, errors, type } = {}) => {
  const body = {
    type:   type  || 'about:blank',
    title:  title || TITLES[status] || 'Error',
    status,
  };
  if (detail) {
    body.detail = detail;
  }
  if (errors) {
    body.errors = errors;
  }
  return body;
};

const send = (res, status, options) => {
  res.status(status);
  res.setHeader('Content-Type', CONTENT_TYPE);
  return res.json(problem(status, options));
};

module.exports = { isApiRequest, problem, send, CONTENT_TYPE };
