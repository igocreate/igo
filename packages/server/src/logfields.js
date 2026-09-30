const redact = require('./redact');

// A diagnosis needs the shape of an import or an attachment, not its content.
const MAX_LENGTH = 2000;

const truncate = (text) => {
  if (!text || text.length <= MAX_LENGTH) {
    return text;
  }
  return `${text.slice(0, MAX_LENGTH)}… (${text.length} chars)`;
};

// A string, not an object: a log pipeline that flattens nested fields would
// turn { title, status } into response_title and response_status, scattering
// one document over several columns.
const asJson = (value) => truncate(JSON.stringify(redact(value)));

const isEmpty = (value) =>
  !value || (typeof value === 'object' && Object.keys(value).length === 0);

const elapsedMs = (start) =>
  Math.round(Number(process.hrtime.bigint() - start) / 1e5) / 10;

const levelFor = (status) => {
  if (status >= 500) {
    return 'error';
  }
  return status >= 400 ? 'warn' : 'info';
};

// A setting is a boolean or a status floor. A failure is logged whatever the
// setting: the setting turns off an access log, not the reporting of a crash,
// whose line is the only trace left.
const shouldLog = (setting, status, failed) => {
  if (failed) {
    return true;
  }
  if (setting === false) {
    return false;
  }
  if (typeof setting === 'number') {
    return status >= setting;
  }
  return true;
};

module.exports = { asJson, elapsedMs, isEmpty, levelFor, shouldLog, truncate };
