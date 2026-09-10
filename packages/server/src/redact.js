
const config = require('./config');

// Keys whose value must never reach a log or a crash email. The default only
// covers what authenticates a caller — the words mean the same in every domain;
// a project's own sensitive fields (an IBAN, a medical record) are its to add
// through config.sensitiveKeys, which replaces this pattern.
//
// The match is anchored: a name *ending* in `password` or `token` in English,
// *starting* with `motDePasse` or `jeton` in French, since the qualifier sits
// on opposite sides in the two languages. `userPassword` and `jetonDeSession`
// are caught; `tokenExpiry`, `cookieJar` and `tokenizer` are not, and neither
// is `tokenApi` — a default that masks a field a diagnosis needed would be a
// nuisance to every project, one that misses a field is one project's to fix.
const ENGLISH = 'password|passwd|token|secret|cookie|authorization';
const FRENCH  = 'mot.?de.?passe|jeton|cle.?secrete';

// A trailing `s`, `_confirmation` or `_hash` still names the same thing.
const DEFAULT_SENSITIVE_KEYS = new RegExp(
  `(${ENGLISH})(s|_?confirmation|_?confirm|_?hash)?$|(${FRENCH})([A-Z_-]|$)`,
  'i'
);

const pattern = () => config.sensitiveKeys || DEFAULT_SENSITIVE_KEYS;

// Only plain objects and arrays are walked. A Date or a Buffer copied key by
// key comes out as `{}`, which is worse than the value it replaced.
const isPlain = (value) => {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

// Returns a copy with every sensitive value replaced. Circular references are
// tracked: a request body can hold one, and a crash report must not recurse
// until the stack gives out.
const redact = (value, seen = new WeakSet()) => {
  if (!value || typeof value !== 'object') {
    return value;
  }
  if (!Array.isArray(value) && !isPlain(value)) {
    return value;
  }
  if (seen.has(value)) {
    return '[circular]';
  }
  seen.add(value);

  const keys = pattern();
  const copy = Array.isArray(value) ? [] : {};
  for (const key in value) {
    copy[key] = keys.test(key) ? '[redacted]' : redact(value[key], seen);
  }
  return copy;
};

module.exports = redact;
module.exports.DEFAULT_SENSITIVE_KEYS = DEFAULT_SENSITIVE_KEYS;
