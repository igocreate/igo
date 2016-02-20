

var formidable = require('formidable');

var RE_MIME = /^(?:multipart\/.+)$/i;



var mime = function(req) {
  var str = req.headers['content-type'] || '';
  return str.split(';')[0];
};

// parse request with formidable
module.exports = function(req, res, next) {
  console.log(mime(req));
  console.dir(req.headers);
  if (req.method !== 'POST' || !RE_MIME.test(mime(req))) {
    return next();
  }

  console.log('parsing multipart');
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    req.body  = fields;
    req.files = files;
    console.dir(req.body);
    console.dir(req.files);
    next();
  });
};
