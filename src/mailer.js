'use strict';

var nodemailer  = require('nodemailer');
var cons        = require('consolidate');
var i18next     = require('i18next');
var winston     = require('winston');

var transport = null, options = null;

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

  if (!data || !data.to || !data.to.email) {
    winston.warn('mailer.send: no email for recipient');
    return;
  }

  data.to       = options.to || data.to;
  data.lang     = data.lang || data.to.lang || 'en';
  data.lng      = data.lang;
  data.urlbase  = options.urlbase;
  data.subject  = data.subject || i18next.t(options.subject(email, data), data);
  data.views    = './views';

  var template  = options.template(email, data);
  cons.dust(template, data, function(err, rendered) {

    if (err || !rendered) {
      winston.error('mailer.send: error - could not render template ' + template);
    } else {
      winston.info('mailer.send: Sending mail ' + email + ' to ' + data.to.email + ' in ' + data.lang);
      var headers = {};
      if (options.subaccount) {
        headers['X-MC-Subaccount'] = options.subaccount;
      }
      var mailOptions = {
        from:     options.defaultfrom,
        to:       data.to.fullname + ' <' + data.to.email + '>',
        cc:       data.cc,
        subject:  data.subject,
        html:     rendered,
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
