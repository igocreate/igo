
const { STATUS_CODES } = require('http');


const CONTENT_TYPE = 'application/problem+json';

// igo produces one problem specific enough to name: everything else is
// identified by its status alone. A URN rather than the /problems/<slug> form
// suggested to applications — a relative URI would resolve differently on every
// project, and would compete with the slugs the application defines.
const VALIDATION_FAILED = 'urn:igo:validation-failed';

// RFC 9457 Problem Details
const problem = (status, { title, detail, errors, type } = {}) => {
  const body = {
    type:   type  || 'about:blank',
    title:  title || STATUS_CODES[status] || 'Error',
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

module.exports = { problem, send, CONTENT_TYPE, VALIDATION_FAILED };
