require('./init');

const assert = require('assert');

const { config, redact } = require('@igojs/server');

describe('redact', function() {

  afterEach(function() {
    config.sensitiveKeys = null;
  });

  it('should redact the usual English field names', () => {
    const out = redact({ password: 'x', token: 'y', authorization: 'z', cookie: 'c' });
    assert.deepStrictEqual(out, {
      password:      '[redacted]',
      token:         '[redacted]',
      authorization: '[redacted]',
      cookie:        '[redacted]',
    });
  });

  // The language convention makes French field names the expected case, so a
  // pattern that only knows `password` would leak the most common one of all.
  it('should redact the French field names', () => {
    const out = redact({ motDePasse: 'x', mot_de_passe: 'y', jeton: 'z' });
    assert.deepStrictEqual(out, {
      motDePasse:   '[redacted]',
      mot_de_passe: '[redacted]',
      jeton:        '[redacted]',
    });
  });

  // Personal, but also what identifies the request that failed. Left in on
  // purpose: a log holding an email is a retention question, not a leaked
  // credential.
  it('should leave harmless fields untouched', () => {
    const out = redact({ email: 'a@b.c', nom: 'Alice', pages: 412, phone: '0600' });
    assert.deepStrictEqual(out, { email: 'a@b.c', nom: 'Alice', pages: 412, phone: '0600' });
  });

  it('should reach into nested objects and arrays', () => {
    const out = redact({ user: { motDePasse: 'x' }, list: [{ token: 't' }] });
    assert.deepStrictEqual(out, { user: { motDePasse: '[redacted]' }, list: [{ token: '[redacted]' }] });
  });

  // A request body can hold a circular reference, and a crash report must not
  // recurse until the stack gives out.
  it('should survive a circular reference', () => {
    const loop = { nom: 'a' };
    loop.self = loop;
    assert.deepStrictEqual(redact(loop), { nom: 'a', self: '[circular]' });
  });

  it('should leave primitives as they are', () => {
    assert.strictEqual(redact('hello'), 'hello');
    assert.strictEqual(redact(42), 42);
    assert.strictEqual(redact(null), null);
    assert.strictEqual(redact(undefined), undefined);
  });

  // The default covers what authenticates a caller, and stops there: a domain
  // field is the project's to declare, since igo cannot guess it.
  it('should leave domain fields to the project', () => {
    const out = redact({ iban: 'FR76', creditCard: '4111', ssn: '185' });
    assert.deepStrictEqual(out, { iban: 'FR76', creditCard: '4111', ssn: '185' });
  });

  it('should catch a credential whatever it is prefixed with', () => {
    const out = redact({ userPassword: 'x', accessToken: 'x', clientSecret: 'x' });
    for (const [key, value] of Object.entries(out)) {
      assert.strictEqual(value, '[redacted]', `${key} left in the clear`);
    }
  });

  it('should let a project set its own pattern', () => {
    config.sensitiveKeys = /dossierMedical/i;
    assert.deepStrictEqual(
      redact({ dossierMedical: 'x', nom: 'Alice' }),
      { dossierMedical: '[redacted]', nom: 'Alice' });
  });

  it('should let a project extend the defaults', () => {
    config.sensitiveKeys = new RegExp(`${redact.DEFAULT_SENSITIVE_KEYS.source}|iban`, 'i');
    assert.deepStrictEqual(
      redact({ iban: 'FR76', motDePasse: 'y', nom: 'Alice' }),
      { iban: '[redacted]', motDePasse: '[redacted]', nom: 'Alice' });
  });

});
