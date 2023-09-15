
const i18next       = require('i18next');
const nodemailer    = require('nodemailer');
const mjml2html     = require('mjml');
const fs            = require('fs');
const path          = require('path');

const config        = require('./config');
const logger        = require('./logger');
const IgoDust       = require('igo-dust');


let transport       = null;
const options       = {};

//
const DEFAULT_SUBJECT = (email) => {
  return `emails.${email}.subject`;
};

//
const DEFAULT_TEMPLATE = (template_name) => {
  if (fs.existsSync(`./views/emails/${template_name}.mjml`)) {
    return `./views/emails/${template_name}.mjml`;
  }
  return `./views/emails/${template_name}.dust`;
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
module.exports.send = async (template_name, data) => {

  if (config.env === 'test') {
    // no emails in test env
    return;
  }

  if (!data || !data.to) {
    logger.warn('mailer.send: no email for recipient');
    return;
  }
  if (!transport) {
    logger.warn('mailer.send: missing transport configuration');
    return;
  }

  data.from     = data.from || config.mailer.defaultfrom;
  data.lang     = data.lang || 'en';
  data.lng      = data.lang;
  data.subject  = data.subject || i18next.t(options.subject(template_name), data);
  data.views    = './views';
  data.t        = (params) => {
    params.lng = data.lang;
    return i18next.t(params.key, params);
  };

  const template = data.template || options.template(template_name);
  const type = template.split('.').pop();
  let html = data.body;

  console.log({template, type});
  const render = (template, data) => {
    return new Promise((resolve, reject) => {
      try {
        const result = IgoDust.engine(template, data);
        resolve([null, result]);
      } catch (err) {
        reject([err, null]);
      }
    });
  };

  const [err, result] = await render(template, data);

  if (err || !result) {
    logger.error('mailer.send: error - could not render template ' + template);
    logger.error(err);
    return;
  }

  if (type === 'mjml') {
    html = mjml2html(result, {
      filePath: path.join(config.projectRoot, 'views/emails/'),    
    }).html;
  } else {
    html = result;
  }

  const emailLog = data.is_anonymous ? '**********' : data.to;
  logger.info('mailer.send: Sending mail ' + template_name + ' to ' + emailLog + ' in ' + data.lang);
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
      logger.error(err);
    } else {
      logger.info('mailer.send: Message ' + template_name + ' sent: ' + res.response);
    }
  });
};
