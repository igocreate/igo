'use strict';

var _           = require('lodash');
var nodemailer  = require('nodemailer');
var cons        = require('consolidate');
var i18next     = require('i18next');
var winston     = require('winston');
var dust        = require('dustjs-linkedin');
var dustHelpers = require('dustjs-helpers');

var transport   = null, options = null;

//
module.exports.init = function(config) {
  options         = config && config.mailer || {};
  options.subject = options.subject || function(email, data) {
    return 'emails.' + email + '.subject';
  };
  options.template = options.template || function(email, data) {
    return './views/emails/' + email + '.dust';
  };
  transport       = nodemailer.createTransport(options.transport);
};

//
module.exports.send = function(email, data) {

  if (!data || !data.to) {
    winston.warn('mailer.send: no email for recipient');
    return;
  }

  data.from     = data.from || options.defaultfrom;
  data.to       = options.to || data.to;
  data.lang     = data.lang || 'en';
  data.lng      = data.lang;
  data.subject  = data.subject || i18next.t(options.subject(email, data), data);
  data.views    = './views';

  var template  = data.template || options.template(email, data);

  var renderBody = function(callback) {
    if (data.body) {
      return callback(null, data.body);
    }
    cons.dust(template, data, callback);
  };

  renderBody(function(err, html) {
    if (err || !html) {
      winston.error('mailer.send: error - could not render template ' + template);
      winston.error(err);
    } else {
      winston.info('mailer.send: Sending mail ' + email + ' to ' + data.to + ' in ' + data.lang);
      var headers = {};
      if (options.subaccount) {
        headers['X-MC-Subaccount'] = options.subaccount;
      }
      var mailOptions = {
        from:     data.from,
        to:       data.to,
        replyTo:  data.replyTo,
        cc:       data.cc,
        subject:  data.subject,
        html:     html,
        headers:  headers
      };
      transport.sendMail(mailOptions, function(err, res) {
        if (err) {
          winston.error(err);
        } else {
          winston.info('mailer.send: Message ' + email + ' sent: ' + res.response);
        }
      });
    }
  });
};
