
'use strict';

const _             = require('lodash');

const AdminUtils    = require('./AdminUtils');
const HtmlRenderer  = require('./HtmlRenderer');


//
module.exports = function(model, options) {

  if (_.isFunction(options.update)) {
    return options.update;
  }

  return function(req, res) {
    model.find(req.body.id, function(err, object) {

      let fields = options.edit && options.edit.fields ||
          options.form && options.form.fields ||
          options.fields;

      fields = AdminUtils.defaultFields(fields);
      AdminUtils.handleParams(fields, req.body);

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
