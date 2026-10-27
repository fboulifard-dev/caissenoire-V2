const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined
    });
  }
  return transporter;
}

async function sendVerificationEmail(to, link) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await getTransporter().sendMail({
    from,
    to,
    subject: 'Activez votre compte Caisse Noire',
    text: `Bienvenue ! Pour activer votre compte, ouvrez ce lien : ${link}`,
    html: `<p>Bienvenue sur Caisse Noire !</p>
<p>Pour activer votre compte, cliquez sur le lien ci-dessous :</p>
<p><a href="${link}">Activer mon compte</a></p>
<p>Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.</p>`
  });
}

module.exports = { sendVerificationEmail };
