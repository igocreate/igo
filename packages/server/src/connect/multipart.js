const fs          = require('fs');

const _           = require('lodash');
const qs          = require('qs');
const multiparty  = require('multiparty');

const config      = require('../config');

const RE_MIME = /^(?:multipart\/.+)$/i;
const DEFAULT_OPTIONS = { maxFilesSize: 50 * 1024 * 1024 };
const mime = function(req) {
  let str = req.headers['content-type'] || '';
  return str.split(';')[0];
};

const format = function(obj, isFiles) {
  // Remove array for single values
  const ret = _.mapValues(obj, value => {

    // Backward compatibility (formidable)
    if (isFiles) {
      _.each(value, v => {v.name = v.originalFilename;});
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

  const form = new multiparty.Form({ ...DEFAULT_OPTIONS, ...config.multiparty });

  form.parse(req, function(err, fields, files) {
    if (err) {
      req.upload_err = err;
      return next();
    }

    // multiparty never deletes its temp files: remove leftovers once the response is done
    // (apps must copy/move files they want to keep before the response ends)
    const paths = _.flatten(_.values(files)).map(file => file.path);
    res.on('close', () => {
      paths.forEach(p => fs.unlink(p, () => {}));
    });

    req.files = format(files, true);
    req.body  = format(fields);
    next();
  });
};
