const _           = require('lodash');
const qs          = require('qs');
const multiparty  = require('multiparty');

const RE_MIME = /^(?:multipart\/.+)$/i;
const mime = function(req) {
  let str = req.headers['content-type'] || '';
  return str.split(';')[0];
};

const format = function(obj, isFiles) {
  // Remove array for single values
  const ret = _.mapValues(obj, value => {

    // Backward compatibility (formidable)
    if (isFiles) {
      _.each(value, v => {v.name = v.originalFilename});
    }
    return value.length === 1 ? value[0] : value;
  });

  // Parse keys
  return qs.parse(ret);
};

// Parse request with multiparty
module.exports = function(req, res, next) {
  if (req.method !== 'POST' || !RE_MIME.test(mime(req))) {
    return next();
  }
  const form = new multiparty.Form();

  form.parse(req, function(err, fields, files) {
    req.files = format(files, true);
    req.body  = format(fields);
    next();
  });
};
