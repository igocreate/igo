// Browser-safe pieces of the Dust render Utils.
// Used as-is by the server (packages/dust/src/render/Utils.js)
// and by @igojs/component's client Utils (packages/component/src/client/dust/Utils.js).
// The server and client each add their own `h` (helpers) and `i` (include resolver)
// on top of these shared primitives.

// HTML escape: single regex + char-to-entity lookup, scanned once.
const HCHARS   = /[&<>"']/;
const HCHARS_G = /[&<>"']/g;
const HTML_ESCAPES = {
  '&':  '&amp;',
  '<':  '&lt;',
  '>':  '&gt;',
  '"':  '&quot;',
  '\'': '&#39;',
};
const escapeHtmlChar = c => HTML_ESCAPES[c];

const htmlencode = (s) => {
  if (!s || !s.replace || !HCHARS.test(s)) {
    return s;
  }
  return s.replace(HCHARS_G, escapeHtmlChar);
};

// JS string escape (|j filter): single regex + char-to-sequence lookup.
const JS_CHARS   = /[\\/"'\r\u2028\u2029\n\f\t]/;
const JS_CHARS_G = /[\\/"'\r\u2028\u2029\n\f\t]/g;
const JS_ESCAPES = {
  '\\':     '\\\\',
  '/':      '\\/',
  '"':      '\\"',
  '\'':     '\\\'',
  '\r':     '\\r',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
  '\n':     '\\n',
  '\f':     '\\f',
  '\t':     '\\t',
};
const escapeJsChar = c => JS_ESCAPES[c];

const escapeJs = (s) => {
  if (typeof s !== 'string' || !JS_CHARS.test(s)) {
    return s;
  }
  return s.replace(JS_CHARS_G, escapeJsChar);
};

// JSON-in-HTML escape (|js filter): keep the JSON safe inside an inline
// <script> tag and across line-terminator-sensitive parsers.
const JSON_CHARS   = /[<\u2028\u2029]/;
const JSON_CHARS_G = /[<\u2028\u2029]/g;
const JSON_ESCAPES = {
  '<':      '\\u003c',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};
const escapeJsonChar = c => JSON_ESCAPES[c];

const stringifyJson = (o) => {
  if (!o) {
    return o;
  }
  const s = JSON.stringify(o);
  return JSON_CHARS.test(s) ? s.replace(JSON_CHARS_G, escapeJsonChar) : s;
};

// Filters
const f = {
  h:          htmlencode,
  j:          escapeJs,
  u:          encodeURI,
  uc:         encodeURIComponent,
  js:         stringifyJson,
  jp:         JSON.parse,
  uppercase:  s => s.toUpperCase(),
  lowercase:  s => s.toLowerCase(),
};

// return value to be displayed
const d = (s, t, l) => {
  if (typeof s === 'function') {
    return s.call(t, l);
  }
  if (s === null || s === undefined) {
    return '';
  }
  return s;
};

// combined deref + htmlencode for `{x}` refs (the hot path)
// equivalent to f.h(d(s, t, l)) but in one call.
const dh = (s, t, l) => {
  if (s == null) {
    return '';
  }
  if (typeof s === 'function') {
    s = s.call(t, l);
  }
  if (typeof s !== 'string' || !HCHARS.test(s)) {
    return s;
  }
  return s.replace(HCHARS_G, escapeHtmlChar);
};

// return value (if it's a function, invoke it with locals)
const v = (s, t, l) => {
  if (typeof s === 'function') {
    return s.call(t, l);
  }
  return s;
};

// return boolean
const b = (v) => {
  if (!v) {
    return false;
  }
  if (v.length === 0) {
    return false;
  }
  return true;
};

// return array
const a = (v) => {
  if (Array.isArray(v)) {
    if (v.length === 0) {
      return null;
    }
    return v;
  }
  if (v) {
    return [v];
  }
  return null;
};

module.exports = { a, b, v, d, dh, f, htmlencode };
