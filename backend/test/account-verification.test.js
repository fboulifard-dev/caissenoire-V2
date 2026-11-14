const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const admin = require('firebase-admin');
const smtp = require('../services/smtp');

test('verification email is restricted to the authenticated unverified account', async (t) => {
  const originalUrl = process.env.EMAIL_VERIFICATION_URL;
  process.env.EMAIL_VERIFICATION_URL = 'https://app.example.com/login';
  let now = 0;
  mock.method(Date, 'now', () => now);
  mock.method(console, 'error', () => {});
  const firebaseAuth = {
    verifyIdToken: async token => {
      if (token === 'invalid') throw new Error('Invalid token');
      return { uid: token };
    },
    getUser: async uid => ({ uid, email: `${uid}@example.com`, emailVerified: uid === 'verified' }),
    generateEmailVerificationLink: async () => 'https://firebase.example.com/action?mode=verifyEmail&oobCode=secure-code'
  };
  mock.method(admin, 'auth', () => () => firebaseAuth, { getter: true });
  const send = mock.method(smtp, 'sendVerificationMail', async () => {});
  const app = express();
  app.use(express.json());
  app.use('/api/account', require('../routes/account-verification'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
    if (originalUrl === undefined) delete process.env.EMAIL_VERIFICATION_URL;
    else process.env.EMAIL_VERIFICATION_URL = originalUrl;
    mock.restoreAll();
  });
  const url = `http://127.0.0.1:${server.address().port}/api/account/verification-email`;
  const post = token => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ email: 'other@example.com', url: 'https://attacker.example.com' })
  });

  assert.equal((await post()).status, 401);
  assert.equal((await post('invalid')).status, 401);
  assert.equal((await post('verified')).status, 400);
  assert.equal((await post('alice')).status, 200);
  assert.deepEqual(send.mock.calls[0].arguments, [
    'alice@example.com', 'https://app.example.com/login?mode=verifyEmail&oobCode=secure-code'
  ]);
  const limited = await post('alice');
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '60');
  assert.equal((await post('bob')).status, 200);
  now += 60000;
  send.mock.mockImplementation(async () => { throw new Error('SMTP failed'); });
  assert.equal((await post('alice')).status, 500);
  assert.equal((await post('alice')).status, 429);
});
