
# Mailer

Igo.js integrates [Nodemailer](https://nodemailer.com/) with MJML and Dust template support.

## Configuration

SMTP is configured via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_HOST` | — | SMTP server |
| `SMTP_PORT` | `465` | SMTP port |
| `SMTP_USER` | — | SMTP user |
| `SMTP_PASSWORD` | — | SMTP password |
| `SMTP_FROM` | — | Default sender address |

Or in `app/config.js`:

```js
config.mailer = {
  defaultfrom: 'noreply@example.com',
  crashemailto: 'admin@example.com',
};
```

## Sending Emails

```js
const { mailer } = require('@igojs/server');

await mailer.send('welcome', {
  to:   'user@example.com',
  name: 'John',
  lang: 'en',
});
```

This will:
1. Look for `views/emails/welcome.mjml` (or `.dust`)
2. Render the template with the provided data
3. Translate the subject via i18next key `emails.welcome.subject`
4. Send the email

## Templates

Email templates are stored in `views/emails/`:

```
views/emails/
├── welcome.mjml       # MJML template (recommended)
├── reset.dust         # Dust template
└── test.dust
```

### MJML Templates

[MJML](https://mjml.io/) templates are automatically compiled to responsive HTML:

```xml
<!-- views/emails/welcome.mjml -->
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>Hello {name}!</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

### Dust Templates

```dust
<!-- views/emails/welcome.dust -->
<h1>Hello {name}!</h1>
<p>Welcome to our platform.</p>
```

## Options

```js
await mailer.send('template_name', {
  to:          'user@example.com',
  from:        'custom@example.com',  // Override default sender
  replyTo:     'support@example.com',
  cc:          'cc@example.com',
  bcc:         'bcc@example.com',
  subject:     'Custom subject',       // Override i18n subject
  lang:        'fr',                   // Language for subject translation
  attachments: [{ filename: 'doc.pdf', path: '/tmp/doc.pdf' }],
});
```

## Render Only

Get the HTML without sending:

```js
const html = await mailer.getHtml('welcome', { name: 'John' });
```

## Crash Emails

Configure `config.mailer.crashemailto` to receive error notification emails. See [Error Handling](./errors) for throttling details.

## Test Environment

Emails are not sent in test mode (`NODE_ENV=test`). Use `mailer.getHtml()` to test template rendering.
