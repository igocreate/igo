

module.exports.toJSON = (s) => {
  try {
    return JSON.stringify(s);
  } catch(_err) {
    return null;
  }
};


module.exports.fromJSON = (json) => {
  try {
    return JSON.parse(json);
  } catch(_err) {
    return null;
  }
};


module.exports.randomString = (length) => {
  let result              = '';
  const characters        = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength  = characters.length;
  for (let i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

module.exports.wait = (ms) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};
// 90 (seconds), 15m, 1h, 1d; throws on anything else
const DURATION_UNITS = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
module.exports.parseDuration = (value, fallback) => {
  if (!value) {
    return fallback;
  }
  const match = /^(\d+)(s|m|h|d)?$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration "${value}": expected a number of seconds, or 15m, 1h, 1d…`);
  }
  return Number(match[1]) * DURATION_UNITS[match[2] || 's'];
};
