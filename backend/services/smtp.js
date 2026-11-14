const fs = require('fs/promises');
const path = require('path');
const nodemailer = require('nodemailer');

async function sendMail(to, subject, text) {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  const port = Number(SMTP_PORT);
  if (!SMTP_HOST || !SMTP_PORT || !Number.isInteger(port) || port < 1 || port > 65535
    || !['true', 'false'].includes(SMTP_SECURE) || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM
    || !to || !/^[^\s@,;<>]+@[^\s@,;<>]+$/.test(to)) {
    throw new Error('Invalid SMTP configuration');
  }

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
  return transport.sendMail({ from: SMTP_FROM, to, subject, text });
}

async function sendVerificationMail(to, verificationUrl) {
  const template = await fs.readFile(path.join(__dirname, '../templates/verification-mail.txt'), 'utf8');
  if (!template.includes('{{verificationUrl}}')) throw new Error('Invalid verification mail template');
  return sendMail(to, 'Vérification de votre compte Caisse Noire', template.replace('{{verificationUrl}}', verificationUrl));
}

module.exports = { sendVerificationMail };
