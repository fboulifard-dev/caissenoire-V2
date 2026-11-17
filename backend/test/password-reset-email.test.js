const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const admin = require('firebase-admin');
const smtp = require('../services/smtp');

test('password reset emails use Firebase links, protect unknown accounts and limit requests', async (t) => {
  const originalUrl = process.env.PASSWORD_RESET_URL;
  process.env.PASSWORD_RESET_URL = 'https://app.example.com/reset-password';
  let now = 0;
  mock.method(Date, 'now', () => now);
  mock.method(console, 'error', () => {});
  const auth = {
    generatePasswordResetLink: mock.fn(async email => {
      if (email === 'unknown@example.com') {
        throw Object.assign(new Error('not found'), { code: 'auth/user-not-found' });
      }
      if (email === 'error@example.com') throw new Error('Firebase failure');
      return 'https://firebase.example.com/action?mode=resetPassword&oobCode=secure-code';
    })
  };
  mock.method(admin, 'auth', () => () => auth, { getter: true });
  const send = mock.method(smtp, 'sendPasswordResetMail', async () => {});
  const app = express();
  app.use(express.json());
  app.use('/api/account', require('../routes/account-verification'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
    if (originalUrl === undefined) delete process.env.PASSWORD_RESET_URL;
    else process.env.PASSWORD_RESET_URL = originalUrl;
    mock.restoreAll();
  });
  const post = email => fetch(`http://127.0.0.1:${server.address().port}/api/account/password-reset-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  assert.equal((await post('invalid')).status, 400);
  const response = await post(' user@example.com ');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(send.mock.calls[0].arguments, [
    'user@example.com', 'https://app.example.com/reset-password?mode=resetPassword&oobCode=secure-code'
  ]);
  const limited = await post('USER@example.com');
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '60');
  const unknown = await post('unknown@example.com');
  assert.equal(unknown.status, 200);
  assert.deepEqual(await unknown.json(), await response.json());
  assert.equal(send.mock.calls.length, 1);
  assert.equal((await post('error@example.com')).status, 500);

  send.mock.mockImplementation(async () => { throw new Error('SMTP failure'); });
  assert.equal((await post('smtp@example.com')).status, 500);
  for (let i = 0; i < 6; i++) assert.equal((await post(`unknown${i}@example.com`)).status, 500);
  assert.equal((await post('another@example.com')).status, 429);

  now += 60000;
  send.mock.mockImplementation(async () => {});
  assert.equal((await post('user@example.com')).status, 200);
  process.env.PASSWORD_RESET_URL = 'http://example.com/reset-password';
  assert.equal((await post('unsafe@example.com')).status, 500);
  process.env.PASSWORD_RESET_URL = 'http://localhost:4200/reset-password';
  assert.equal((await post('local@example.com')).status, 200);
  assert.equal(send.mock.calls.at(-1).arguments[1], 'http://localhost:4200/reset-password?mode=resetPassword&oobCode=secure-code');
  auth.generatePasswordResetLink.mock.mockImplementation(async () => 'https://firebase.example.com/action?mode=verifyEmail&oobCode=code');
  assert.equal((await post('wrong-mode@example.com')).status, 500);
});
