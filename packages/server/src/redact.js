
const config = require('./config');

// Keys whose value must never reach a log, a crash email or an error report.
//
// The list stays short on purpose: it covers what authenticates a caller, and
// nothing else. Those words mean the same thing in every domain — a `token` is
// a credential whether the project sells shoes or manages patients — so igo can
// claim to know them.
//
// Everything else belongs to the project. A bank knows its account fields, a
// clinic its medical ones, and igo can only guess — a longer default list would
// still miss the one field this domain calls sensitive, while masking others a
// diagnosis needed.
//
//   const { redact } = require('@igojs/server');
//   config.sensitiveKeys = new RegExp(
//     `${redact.DEFAULT_SENSITIVE_KEYS.source}|iban|numero.?secu`, 'i');
//
// The match is anchored, not a bare substring: a name *ending* in `password`
// or `token` in English, *starting* with `motDePasse` or `jeton` in French —
// the qualifier sits before the word in one language and after it in the
// other. `userPassword` and `jetonDeSession` are caught; `tokenExpiry`,
// `cookieJar` and `tokenizer` are not.
//
// Anchoring means the default misses names like `tokenApi` or `jwtSecret_v2`.
// That is the point of the trade: a default that masks a field a diagnosis
// needed is a nuisance to every project, while a default that misses one is
// the project's to fix — it knows its own field names, and extends the pattern
// through config.sensitiveKeys.
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
