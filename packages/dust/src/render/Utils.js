
const Cache   = require('../Cache');
const Helpers = require('./Helpers');

// HTML escape: single regex + char\u2192entity lookup, scanned once.
const HCHARS  = /[&<>"']/;
const HCHARS_G = /[&<>"']/g;
const ESCAPES = {
  '&':  '&amp;',
  '<':  '&lt;',
  '>':  '&gt;',
  '"':  '&quot;',
  '\'': '&#39;',
};
const escapeChar = c => ESCAPES[c];

const BS      = /\\/g,
  FS      = /\//g,
  CR      = /\r/g,
  LS      = /\u2028/g,
  PS      = /\u2029/g,
  LT      = /</g,
  NL      = /\n/g,
  LF      = /\f/g,
  SQ      = /'/g,
  DQ      = /"/g,
  TB      = /\t/g;


const htmlencode = (s)=> {
  if (!s || !s.replace || !HCHARS.test(s)) {
    return s;
  }
  return s.replace(HCHARS_G, escapeChar);
};

const escapeJs = (s) => {
  if (typeof s === 'string') {
    return s
    .replace(BS, '\\\\')
    .replace(FS, '\\/')
    .replace(DQ, '\\"')
    .replace(SQ, '\\\'')
    .replace(CR, '\\r')
    .replace(LS, '\\u2028')
    .replace(PS, '\\u2029')
    .replace(NL, '\\n')
    .replace(LF, '\\f')
    .replace(TB, '\\t');
  }
  return s;
};

const stringifyJson = (o) => {
  return o && JSON.stringify(o)
  .replace(LS, '\\u2028')
  .replace(PS, '\\u2029')
  .replace(LT, '\\u003c');
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
  return s.replace(HCHARS_G, escapeChar);
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

// helpers
const h = async (t, p, l, body) => {
  if (!h.helpers || !h.helpers[t]) {
    throw new Error(`Error: helper @${t} not found!`);
  }
  return await h.helpers[t](p, l, body);
};
h.helpers = Helpers;

// include file
const i = async (file) => {
  if (!file.endsWith('.dust')) {
    file = file + '.dust';
  }
  return await Cache.getCompiled(file);
};

module.exports = { a, b, v, d, dh, h, f, i };
