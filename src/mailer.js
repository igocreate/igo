const i18next     = require('i18next');
const nodemailer  = require('nodemailer');
const mjml2html   = require('mjml-4-terser');
const fs          = require('fs');
const path        = require('path');

const config      = require('./config');
const logger      = require('./logger');
const IgoDust     = require('igo-dust');

let transport     = null;
const options     = {};

// Generate default subject key
const DEFAULT_SUBJECT = (email) => `emails.${email}.subject`;

// Resolve default template path
const DEFAULT_TEMPLATE = (templateName) => {
  const mjmlPath = `${config.projectRoot}/views/emails/${templateName}.mjml`;
  const dustPath = `${config.projectRoot}/views/emails/${templateName}.dust`;
  return fs.existsSync(mjmlPath) ? mjmlPath : dustPath;
};

// Initialize mailer with transport and options
const init = () => {
  if (config.mailer) {
    transport        = nodemailer.createTransport(config.mailer.transport);
    options.subject  = config.mailer.subject  || DEFAULT_SUBJECT;
    options.template = config.mailer.template || DEFAULT_TEMPLATE;
  }
};

// Generate HTML content from template and data
const getHtml = async (templateName, data) => {
  if (data.body) return data.body;

  const template = data.template || options.template(templateName);

  let html;
  try {
    html = IgoDust.engine(template, data);
  } catch (err) {
    logger.error(`mailer.send: error - could not render template ${template}`);
    logger.error(err);
    return null;
  }

  if (template.endsWith('.mjml')) {
    const result = await mjml2html(html, {
      filePath: path.join(config.projectRoot, 'views/emails/')
    });
    html = result.html;
  }

  return html;
};

// Send an email using the provided template and data
const send = async (templateName, data) => {
  if (config.env === 'test') return;

  if (!data || !data.to) {
    logger.warn('mailer.send: no email for recipient');
    return;
  }

  if (!transport) {
    logger.warn('mailer.send: missing transport configuration');
    return;
  }

  data.from    = data.from    || config.mailer.defaultfrom;
  data.lang    = data.lang    || 'en';
  data.lng     = data.lang;
  data.subject = data.subject || i18next.t(options.subject(templateName), data);
  data.views   = './views';
  data.t       = (params) => {
    params.lng = data.lang;
    return i18next.t(params.key, params);
  };

  const html = await getHtml(templateName, data);

  if (!html) {
    logger.error(`mailer.send: Empty mail content (${templateName})`);
    return;
  }

  const emailLog = data.is_anonymous ? '**********' : data.to;
  logger.info(`mailer.send: Sending mail ${templateName} to ${emailLog} in ${data.lang}`);

  const headers = {};
  if (config.mailer.subaccount) {
    headers['X-MC-Subaccount'] = config.mailer.subaccount;
  }

  const mailOptions = {
    from:        data.from,
    to:          data.to,
    replyTo:     data.replyTo,
    cc:          data.cc,
    bcc:         data.bcc,
    attachments: data.attachments,
    subject:     data.subject,
    html,
    headers
  };

  transport.sendMail(mailOptions, (err, res) => {
    if (err) {
      logger.error(err);
    } else {
      logger.info(`mailer.send: Message ${templateName} sent: ${res.response}`);
    }
  });
};

module.exports = {
  init,
  getHtml,
  send
};
