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
    getUser: async uid => ({ uid, email: `${uid}@example.com`, displayName: `${uid} Martin`, emailVerified: uid === 'verified' }),
    getUserByEmail: async email => {
      if (email === 'available@example.com') throw Object.assign(new Error('not found'), { code: 'auth/user-not-found' });
      if (email === 'error@example.com') throw new Error('Firebase failure');
      return { email };
    },
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
    'alice@example.com', 'https://app.example.com/login?mode=verifyEmail&oobCode=secure-code', 'alice Martin'
  ]);
  const limited = await post('alice');
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '60');
  assert.equal((await post('bob')).status, 200);
  now += 60000;
  send.mock.mockImplementation(async () => { throw new Error('SMTP failed'); });
  assert.equal((await post('alice')).status, 500);
  assert.equal((await post('alice')).status, 429);

  const check = email => fetch(`http://127.0.0.1:${server.address().port}/api/account/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  let response = await check('available@example.com');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { available: true });
  response = await check('existing@example.com');
  assert.deepEqual(await response.json(), { available: false });
  assert.equal((await check('invalid')).status, 400);
  assert.equal((await check('error@example.com')).status, 500);
  for (let i = 0; i < 6; i++) assert.equal((await check('existing@example.com')).status, 200);
  response = await check('existing@example.com');
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '60');
  now += 60000;
  assert.equal((await check('available@example.com')).status, 200);
});
