const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');
const { sendVerificationMail } = require('../services/smtp');

test('verification email uses the configured mailbox and secure SMTP', async (t) => {
  const keys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  t.after(() => {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
    mock.restoreAll();
  });
  Object.assign(process.env, {
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '465',
    SMTP_SECURE: 'true',
    SMTP_USER: 'sender@example.com',
    SMTP_PASSWORD: 'test-password',
    SMTP_FROM: 'sender@example.com'
  });
  const sendMail = mock.fn(async () => ({ accepted: ['recipient@example.com'] }));
  const createTransport = mock.method(nodemailer, 'createTransport', () => ({ sendMail }));
  const url = 'https://app.example.com/login?oobCode=code';
  await sendVerificationMail('recipient@example.com', url);
  const message = sendMail.mock.calls[0].arguments[0];
  assert.equal(message.from, 'sender@example.com');
  assert.equal(message.to, 'recipient@example.com');
  assert.match(message.subject, /Vérification/);
  assert.ok(message.text.includes(url));
  assert.doesNotMatch(message.text, /\{\{verificationUrl\}\}/);
  assert.equal(createTransport.mock.calls[0].arguments[0].secure, true);
  assert.equal(createTransport.mock.calls[0].arguments[0].requireTLS, false);
  assert.deepEqual(createTransport.mock.calls[0].arguments[0].auth, { user: 'sender@example.com', pass: 'test-password' });

  process.env.SMTP_PORT = '587';
  process.env.SMTP_SECURE = 'false';
  await sendVerificationMail('recipient@example.com', url);
  assert.equal(createTransport.mock.calls[1].arguments[0].requireTLS, true);

  await assert.rejects(sendVerificationMail('one@example.com,two@example.com', url), /Invalid SMTP configuration/);
  process.env.SMTP_PORT = 'invalid';
  await assert.rejects(sendVerificationMail('recipient@example.com', url), /Invalid SMTP configuration/);
  assert.equal(createTransport.mock.calls.length, 2);

  process.env.SMTP_PORT = '587';
  createTransport.mock.mockImplementation(() => ({
    sendMail: async () => { throw new Error('SMTP failure'); }
  }));
  await assert.rejects(sendVerificationMail('recipient@example.com', url), /SMTP failure/);
});
