const config = require('../config');
const logger = require('../logger');
const { asJson, isEmpty, levelFor, shouldLog, truncate } = require('../logfields');

const TEXT = /json|text|xml|x-www-form-urlencoded/i;
const FORM = /x-www-form-urlencoded/i;

const settingFor = (host) =>
  (Object.hasOwn(config.loghttpcallsByHost ?? {}, host)
    ? config.loghttpcallsByHost[host]
    : config.loghttpcalls);

const isBinary = (payload) =>
  payload instanceof ArrayBuffer || ArrayBuffer.isView(payload);

const toBuffer = (payload) => (ArrayBuffer.isView(payload)
  ? Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength)
  : Buffer.from(payload));

const isDocument = (value) => Array.isArray(value)
  || [Object.prototype, null].includes(Object.getPrototypeOf(value));

// Parsed whenever possible, so that redact() reaches the keys: a form too,
// since a token request carries its client secret there. A file, a stream or
// a multipart body has nothing a diagnosis reads.
const readable = (payload, contentType = '') => {
  if (payload === undefined || payload === null || payload === '') {
    return undefined;
  }
  if (payload instanceof URLSearchParams) {
    return Object.fromEntries(payload);
  }
  if (isBinary(payload)) {
    if (!TEXT.test(contentType)) {
      return undefined;
    }
    payload = toBuffer(payload).toString('utf8');
  }
  if (typeof payload === 'string') {
    if (FORM.test(contentType)) {
      return Object.fromEntries(new URLSearchParams(payload));
    }
    try {
      return JSON.parse(payload);
    } catch {
      return payload;
    }
  }
  return typeof payload === 'object' && isDocument(payload) ? payload : undefined;
};

// A text that is not a document has no keys to redact, and is kept as is.
const serialize = (value) =>
  (typeof value === 'string' ? truncate(value) : asJson(value));

const payloads = (call) => {
  const fields   = {};
  const body     = readable(call.body, call.bodyType);
  const response = readable(call.response, call.responseType);
  if (body !== undefined) {
    fields.body = serialize(body);
  }
  if (response !== undefined) {
    fields.response = serialize(response);
  }
  return fields;
};

// Some errors have no message: an AggregateError, when every address refused.
const causeOf = (error) =>
  (error?.message ? String(error) : String(error?.code ?? error));

// A call without a status got no answer — refused, reset, timed out.
module.exports.logCall = (call) => {
  try {
    const url      = new URL(call.url);
    const answered = Boolean(call.status);
    const failed   = !answered || call.status >= 400;
    if (!shouldLog(settingFor(url.host), call.status, !answered)) {
      return;
    }
    const level   = answered ? levelFor(call.status) : 'error';
    const message = answered ? 'http call' : causeOf(call.error);
    const query   = Object.fromEntries(url.searchParams);
    logger.log(level, message, {
      method: call.method.toUpperCase(),
      host:   url.host,
      path:   url.pathname,
      ...(answered ? { status: call.status } : { code: call.error?.code }),
      duration_ms: call.durationMs,
      ...(isEmpty(query) ? {} : { query: asJson(query) }),
      ...(failed ? payloads(call) : {}),
    });
  } catch (err) {
    // the call it describes must go on regardless
    logger.warn(`http call not logged: ${err.message}`);
  }
};
