const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');
const express = require('express');
const admin = require('firebase-admin');
const { sendPasswordResetMail } = require('../services/smtp');

test('password reset mail uses configured SMTP and escapes the Firebase link', async (t) => {
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
    SMTP_HOST: 'smtp.example.com', SMTP_PORT: '465', SMTP_SECURE: 'true',
    SMTP_USER: 'sender@example.com', SMTP_PASSWORD: 'test-password', SMTP_FROM: 'sender@example.com'
  });
  const sendMail = mock.fn(async () => ({}));
  const realCreateTransport = nodemailer.createTransport;
  const transport = mock.method(nodemailer, 'createTransport', () => ({ sendMail }));
  const url = 'https://app.example.com/reset-password?mode=resetPassword&oobCode=code';
  await sendPasswordResetMail('recipient@example.com', url);
  const message = sendMail.mock.calls[0].arguments[0];
  assert.equal(message.from, 'sender@example.com');
  assert.equal(message.to, 'recipient@example.com');
  assert.match(message.subject, /Réinitialisation/);
  assert.ok(message.text.includes(url));
  assert.doesNotMatch(message.text, /\{\{resetUrl\}\}/);
  assert.ok(message.html.includes('href="https://app.example.com/reset-password?mode=resetPassword&amp;oobCode=code"'));
  assert.doesNotMatch(message.html, /\{\{resetUrl\}\}/);
  assert.deepEqual(transport.mock.calls[0].arguments[0].auth, { user: 'sender@example.com', pass: 'test-password' });
  assert.equal(transport.mock.calls[0].arguments[0].secure, true);

  const streamTransport = realCreateTransport({ streamTransport: true, buffer: true });
  transport.mock.mockImplementation(() => streamTransport);
  const result = await sendPasswordResetMail('recipient@example.com', url);
  const mime = result.message.toString('utf8');
  assert.match(mime, /Content-Type: text\/plain/);
  assert.match(mime, /Content-Type: text\/html/);

  transport.mock.mockImplementation(() => ({ sendMail }));
  sendMail.mock.mockImplementation(async () => { throw new Error('SMTP failure'); });
  await assert.rejects(sendPasswordResetMail('recipient@example.com', url), /SMTP failure/);
});

test('password reset API renders the HTML template and sends it through SMTP', async (t) => {
  const keys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM', 'PASSWORD_RESET_URL'];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, {
    SMTP_HOST: 'smtp.example.com', SMTP_PORT: '465', SMTP_SECURE: 'true',
    SMTP_USER: 'sender@example.com', SMTP_PASSWORD: 'test-password', SMTP_FROM: 'sender@example.com',
    PASSWORD_RESET_URL: 'https://app.example.com/reset-password'
  });
  mock.method(admin, 'auth', () => () => ({
    generatePasswordResetLink: async () => 'https://firebase.example.com/action?mode=resetPassword&oobCode=code'
  }), { getter: true });
  const sendMail = mock.fn(async () => ({}));
  mock.method(nodemailer, 'createTransport', () => ({ sendMail }));
  const app = express();
  app.use(express.json());
  app.use('/api/account', require('../routes/account-verification'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
    mock.restoreAll();
  });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/account/password-reset-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'recipient@example.com' })
  });
  assert.equal(response.status, 200);
  assert.equal(sendMail.mock.calls.length, 1);
  const message = sendMail.mock.calls[0].arguments[0];
  assert.equal(message.to, 'recipient@example.com');
  assert.ok(message.text.includes('https://app.example.com/reset-password?mode=resetPassword&oobCode=code'));
  assert.match(message.html, /href="https:\/\/app\.example\.com\/reset-password\?mode=resetPassword&amp;oobCode=code"/);
});
