const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const nodemailer = require('nodemailer');
const { sendTestMail } = require('../services/smtp');

test('test email uses the configured mailbox, recipient and template', async (t) => {
  const keys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM', 'SMTP_TEST_TO'];
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
    SMTP_FROM: 'sender@example.com',
    SMTP_TEST_TO: 'recipient@example.com'
  });
  const sendMail = mock.fn(async () => ({ accepted: ['recipient@example.com'] }));
  const createTransport = mock.method(nodemailer, 'createTransport', () => ({ sendMail }));
  await sendTestMail();
  assert.deepEqual(sendMail.mock.calls[0].arguments[0], {
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: 'test',
    text: await fs.readFile(path.join(__dirname, '../templates/test-mail.txt'), 'utf8')
  });
  assert.equal(createTransport.mock.calls[0].arguments[0].secure, true);
  assert.equal(createTransport.mock.calls[0].arguments[0].requireTLS, false);
  assert.deepEqual(createTransport.mock.calls[0].arguments[0].auth, { user: 'sender@example.com', pass: 'test-password' });

  process.env.SMTP_PORT = '587';
  process.env.SMTP_SECURE = 'false';
  await sendTestMail();
  assert.equal(createTransport.mock.calls[1].arguments[0].requireTLS, true);

  process.env.SMTP_TEST_TO = 'one@example.com,two@example.com';
  await assert.rejects(sendTestMail(), /Invalid SMTP configuration/);
  process.env.SMTP_TEST_TO = 'recipient@example.com';
  process.env.SMTP_PORT = 'invalid';
  await assert.rejects(sendTestMail(), /Invalid SMTP configuration/);
  assert.equal(createTransport.mock.calls.length, 2);

  process.env.SMTP_PORT = '587';
  createTransport.mock.mockImplementation(() => ({
    sendMail: async () => { throw new Error('SMTP failure'); }
  }));
  await assert.rejects(sendTestMail(), /SMTP failure/);
});
