
'use strict';

const _             = require('lodash');

const HtmlRenderer  = require('./HtmlRenderer');


//
module.exports = function(model, options) {

  return function(req, res) {
    model.find(req.body.id, function(err, object) {

      object.update(req.body, function(err, object) {
        if (err) {
          // error, return to form
          req.flash('warning', '' + err);
          req.flash(options.name, req.body);
          return res.redirect(options.adminpath + '/' + options.plural + '/' + req.body.id + '/edit');
        }
        res.redirect(options.adminpath + '/' + options.plural + '/' + object.id);
      });
    });
  }
}
