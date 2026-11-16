const fs = require('fs/promises');
const path = require('path');
const nodemailer = require('nodemailer');

async function sendMail(to, subject, text, html, attachments) {
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
  return transport.sendMail({ from: SMTP_FROM, to, subject, text, html, attachments });
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

async function sendVerificationMail(to, verificationUrl, displayName) {
  const [textTemplate, htmlTemplate] = await Promise.all([
    fs.readFile(path.join(__dirname, '../templates/verification-mail.txt'), 'utf8'),
    fs.readFile(path.join(__dirname, '../templates/verification-mail.html'), 'utf8')
  ]);
  if (![textTemplate, htmlTemplate].every(template =>
    template.includes('{{greeting}}') && template.includes('{{verificationUrl}}'))) {
    throw new Error('Invalid verification mail template');
  }
  const name = typeof displayName === 'string' ? displayName.trim().replace(/[\r\n]+/g, ' ') : '';
  const greeting = name ? `Bonjour ${name},` : 'Bonjour,';
  const text = textTemplate.replace('{{greeting}}', () => greeting)
    .replace('{{verificationUrl}}', () => verificationUrl);
  const html = htmlTemplate.replace('{{greeting}}', () => escapeHtml(greeting))
    .replace('{{verificationUrl}}', () => escapeHtml(verificationUrl));
  return sendMail(to, 'Vérification de votre compte Caisse Noire', text, html, [{
    filename: 'logo-asptt.png',
    path: path.join(__dirname, '../templates/logo-asptt.png'),
    cid: 'caisse-noire-logo'
  }]);
}

module.exports = { sendVerificationMail };
