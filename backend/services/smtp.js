const fs = require('fs/promises');
const path = require('path');
const nodemailer = require('nodemailer');

async function sendTestMail() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_TEST_TO } = process.env;
  const port = Number(SMTP_PORT);
  if (!SMTP_HOST || !SMTP_PORT || !Number.isInteger(port) || port < 1 || port > 65535
    || !['true', 'false'].includes(SMTP_SECURE) || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM
    || !SMTP_TEST_TO || !/^[^\s@,;<>]+@[^\s@,;<>]+$/.test(SMTP_TEST_TO)) {
    throw new Error('Invalid SMTP configuration');
  }

  const text = await fs.readFile(path.join(__dirname, '../templates/test-mail.txt'), 'utf8');
  if (!text.trim()) throw new Error('The test mail template is empty');

  const secure = SMTP_SECURE === 'true';
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    requireTLS: !secure,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000
  });
  return transport.sendMail({ from: SMTP_FROM, to: SMTP_TEST_TO, subject: 'test', text });
}

module.exports = { sendTestMail };
