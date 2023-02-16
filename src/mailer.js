
const i18next     = require('i18next');
const nodemailer  = require('nodemailer');

const config      = require('./config');
const igodust     = require('./engines/igodust');

let transport     = null;
const options     = {};

//
const DEFAULT_SUBJECT = (email) => {
  return `emails.${email}.subject`;
};

//
const DEFAULT_TEMPLATE = (email) => {
  return `./views/emails/${email}.dust`;
};

//
module.exports.init = function() {
  if (config.mailer) {
    transport         = nodemailer.createTransport(config.mailer.transport);
    options.subject   = config.mailer.subject   || DEFAULT_SUBJECT;
    options.template  = config.mailer.template  || DEFAULT_TEMPLATE;
  }
};

//
module.exports.send = function(email, data) {

  if (config.env === 'test') {
    // no emails in test env
    return;
  }

  if (!data || !data.to) {
    console.warn('mailer.send: no email for recipient');
    return;
  }
  if (!transport) {
    console.warn('mailer.send: missing transport configuration');
    return;
  }

  data.from     = data.from || config.mailer.defaultfrom;
  data.lang     = data.lang || 'en';
  data.lng      = data.lang;
  data.subject  = data.subject || i18next.t(options.subject(email, data), data);
  data.views    = './views';

  const template  = data.template || options.template(email, data);
  
  //
  const renderBody = (callback) => {
    if (data.body) {
      return callback(null, data.body);
    }
    igodust.render(template, data, callback);

  };


  renderBody((err, html) => {
    if (err || !html) {
      console.error('mailer.send: error - could not render template ' + template);
      console.error(err);
      return;
    }

    const emailLog = data.is_anonymous ? '**********' : data.to;
    console.info('mailer.send: Sending mail ' + email + ' to ' + emailLog + ' in ' + data.lang);
    const headers = {};
    if (config.mailer.subaccount) {
      headers['X-MC-Subaccount'] = config.mailer.subaccount;
    }
    var mailOptions = {
      from:         data.from,
      to:           data.to,
      replyTo:      data.replyTo,
      cc:           data.cc,
      bcc:          data.bcc,
      attachments:  data.attachments,
      subject:      data.subject,
      html,
      headers
    };
    transport.sendMail(mailOptions, function(err, res) {
      if (err) {
        console.error(err);
      } else {
        console.info('mailer.send: Message ' + email + ' sent: ' + res.response);
      }
    });
  });
};
