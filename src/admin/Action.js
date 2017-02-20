
'use strict';

const _             = require('lodash');

const AdminUtils    = require('./AdminUtils');


//
module.exports = function(value, action, model, options) {

  return function(req, res) {
    model.find(req.body.id, function(err, object) {
      value.handler(object, req, res);
    });
  }
}
