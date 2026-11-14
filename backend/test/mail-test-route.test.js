const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const smtp = require('../services/smtp');

test('public test endpoint is opt-in, uses no request data and limits attempts', { timeout: 5000 }, async (t) => {
  const originalEnabled = process.env.SMTP_TEST_ENABLED;
  let now = 0;
  let finishSend;
  let notifySend;
  const started = new Promise(resolve => { notifySend = resolve; });
  const send = mock.method(smtp, 'sendTestMail', () => new Promise(resolve => {
    finishSend = resolve;
    notifySend();
  }));
  mock.method(Date, 'now', () => now);
  mock.method(console, 'error', () => {});
  const app = express();
  app.use(express.json());
  app.use('/api/mail', require('../routes/mail-test'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
    if (originalEnabled === undefined) delete process.env.SMTP_TEST_ENABLED;
    else process.env.SMTP_TEST_ENABLED = originalEnabled;
    mock.restoreAll();
  });
  const url = `http://127.0.0.1:${server.address().port}/api/mail/test`;
  const get = () => fetch(`${url}?to=other@example.com&subject=Changed&text=Changed`);

  delete process.env.SMTP_TEST_ENABLED;
  assert.equal((await get()).status, 404);
  process.env.SMTP_TEST_ENABLED = 'true';
  assert.equal((await fetch(url, { method: 'POST' })).status, 404);
  const first = get();
  await started;
  let response = await get();
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '60');
  assert.deepEqual(send.mock.calls[0].arguments, []);
  finishSend();
  assert.equal((await first).status, 200);
  assert.equal((await get()).status, 429);

  now += 60000;
  send.mock.mockImplementation(async () => { throw new Error('SMTP failure'); });
  response = await get();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'Failed to send test email' });
  assert.equal((await get()).status, 429);
});
