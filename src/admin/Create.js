
'use strict';

const _             = require('lodash');

const HtmlRenderer  = require('./HtmlRenderer');


//
module.exports = function(model, options) {

  return function(req, res) {
    model.create(req.body, function(err, object) {
      if (err) {
        // error, return to form
        req.flash('warning', '' + err);
        req.flash(options.name, req.body);
        return res.redirect(options.adminpath + '/' + options.plural + '/new');
      }
      res.redirect(options.adminpath + '/' + options.plural + '/' + object.id);
    });
  }
}
