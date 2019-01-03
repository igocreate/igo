
const cons        = require('consolidate');
const dust        = require('dustjs-linkedin');
const i18next     = require('i18next');
const nodemailer  = require('nodemailer');

const config    = require('./config');
const logger    = require('./logger');

let transport   = null, options = null;

//
module.exports.init = function() {
  if (config.mailer) {
    transport = nodemailer.createTransport(config.mailer.transport);
  }
};

//
module.exports.send = function(email, data) {

  if (!data || !data.to) {
    logger.warn('mailer.send: no email for recipient');
    return;
  }

  data.from     = data.from || options.defaultfrom;
  data.to       = options.to || data.to;
  data.lang     = data.lang || 'en';
  data.lng      = data.lang;
  data.subject  = data.subject || i18next.t(options.subject(email, data), data);
  data.views    = './views';

  data.t = function(chunk, context, bodies, params) {
    var key         = dust.helpers.tap(params.key, chunk, context);
    params.lng      = data.lang;
    var translation = i18next.t(key, params);
    return chunk.write(translation);
  };

  var template  = data.template || options.template(email, data);

  var renderBody = function(callback) {
    if (data.body) {
      return callback(null, data.body);
    }
    cons.dust(template, data, callback);
  };

  renderBody(function(err, html) {
    if (err || !html) {
      logger.error('mailer.send: error - could not render template ' + template);
      logger.error(err);
    } else {
      logger.info('mailer.send: Sending mail ' + email + ' to ' + data.to + ' in ' + data.lang);
      var headers = {};
      if (options.subaccount) {
        headers['X-MC-Subaccount'] = options.subaccount;
      }
      var mailOptions = {
        from:         data.from,
        to:           data.to,
        replyTo:      data.replyTo,
        cc:           data.cc,
        bcc:          data.bcc,
        attachments:  data.attachments,
        subject:      data.subject,
        html:         html,
        headers:      headers
      };
      transport.sendMail(mailOptions, function(err, res) {
        if (err) {
          logger.error(err);
        } else {
          logger.info('mailer.send: Message ' + email + ' sent: ' + res.response);
        }
      });
    }
  });
};
