const express = require('express');
const admin = require('firebase-admin');
const { verifyToken } = require('../middleware/auth');
const { sendVerificationEmail } = require('../services/mailer');

const router = express.Router();

router.post('/send-verification', verifyToken, async (req, res) => {
  const appUrl = (process.env.APP_URL || '').replace(/\/+$/, '');
  if (!appUrl || !process.env.SMTP_HOST) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const user = await admin.auth().getUser(req.user.uid);
    if (!user.email) return res.status(400).json({ error: 'No email on account' });
    if (user.emailVerified) return res.json({ sent: false, alreadyVerified: true });

    // Le lien Firebase n'est utilisé que pour en extraire le code, le lien envoyé pointe vers l'application
    const firebaseLink = await admin.auth().generateEmailVerificationLink(user.email);
    const oobCode = new URL(firebaseLink).searchParams.get('oobCode');
    const link = `${appUrl}/?mode=verifyEmail&oobCode=${encodeURIComponent(oobCode)}`;

    await sendVerificationEmail(user.email, link);
    res.json({ sent: true });
  } catch (err) {
    console.error('send-verification failed', err);
    res.status(500).json({ error: 'Unable to send verification email' });
  }
});

module.exports = router;
