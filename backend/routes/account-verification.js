const express = require('express');
const admin = require('firebase-admin');
const { verifyToken } = require('../middleware/auth');
const { sendVerificationMail, sendPasswordResetMail } = require('../services/smtp');

const router = express.Router();
const attempts = new Map();
const intervalMs = 60 * 1000;
const availabilityAttempts = new Map();
const passwordResetIpAttempts = new Map();
const passwordResetEmailAttempts = new Map();

router.post('/availability', async (req, res) => {
  const now = Date.now();
  for (const [ip, entry] of availabilityAttempts) {
    if (now >= entry.until) availabilityAttempts.delete(ip);
  }
  const entry = availabilityAttempts.get(req.ip);
  if (entry && entry.count >= 10) {
    res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000)));
    return res.status(429).json({ error: 'Too many availability checks' });
  }
  if (entry) entry.count++;
  else availabilityAttempts.set(req.ip, { count: 1, until: now + intervalMs });
  res.set('Cache-Control', 'no-store');

  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  if (email.length > 254 || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  try {
    await admin.auth().getUserByEmail(email);
    res.json({ available: false });
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      return res.json({ available: true });
    }
    console.error('Account availability check failed:', err.code || 'Firebase error');
    res.status(500).json({ error: 'Failed to check account availability' });
  }
});

router.post('/password-reset-email', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  if (email.length > 254 || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const now = Date.now();
  for (const attempts of [passwordResetIpAttempts, passwordResetEmailAttempts]) {
    for (const [key, entry] of attempts) {
      if (now >= entry.until) attempts.delete(key);
    }
  }
  const emailKey = email.toLowerCase();
  const ipEntry = passwordResetIpAttempts.get(req.ip);
  const emailEntry = passwordResetEmailAttempts.get(emailKey);
  if ((ipEntry && ipEntry.count >= 10) || emailEntry) {
    const until = Math.max(ipEntry?.count >= 10 ? ipEntry.until : 0, emailEntry?.until || 0);
    res.set('Retry-After', String(Math.ceil((until - now) / 1000)));
    return res.status(429).json({ error: 'Too many password reset requests' });
  }
  if (ipEntry) ipEntry.count++;
  else passwordResetIpAttempts.set(req.ip, { count: 1, until: now + intervalMs });
  passwordResetEmailAttempts.set(emailKey, { until: now + intervalMs });

  try {
    const appUrl = new URL(process.env.PASSWORD_RESET_URL);
    if (appUrl.protocol !== 'https:' && !(appUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(appUrl.hostname))) {
      throw new Error('Invalid password reset URL');
    }
    const firebaseUrl = new URL(await admin.auth().generatePasswordResetLink(email));
    const code = firebaseUrl.searchParams.get('oobCode');
    if (firebaseUrl.protocol !== 'https:' || firebaseUrl.searchParams.get('mode') !== 'resetPassword' || !code) {
      throw new Error('Invalid Firebase password reset link');
    }
    appUrl.searchParams.set('mode', 'resetPassword');
    appUrl.searchParams.set('oobCode', code);
    await sendPasswordResetMail(email, appUrl.toString());
  } catch (err) {
    if (err.code !== 'auth/user-not-found') {
      console.error('Password reset email failed:', err.code || 'configuration or SMTP error');
      return res.status(500).json({ error: 'Failed to send password reset email' });
    }
  }
  res.json({ message: 'If an account exists, a reset email has been requested' });
});

router.post('/verification-email', verifyToken, async (req, res) => {
  const now = Date.now();
  for (const [uid, time] of attempts) {
    if (now - time >= intervalMs) attempts.delete(uid);
  }
  if (attempts.has(req.user.uid)) {
    res.set('Retry-After', String(Math.ceil((attempts.get(req.user.uid) + intervalMs - now) / 1000)));
    return res.status(429).json({ error: 'Please wait before requesting another verification email' });
  }
  attempts.set(req.user.uid, now);

  try {
    const user = await admin.auth().getUser(req.user.uid);
    if (!user.email || user.emailVerified) {
      return res.status(400).json({ error: 'Account does not require email verification' });
    }

    const appUrl = new URL(process.env.EMAIL_VERIFICATION_URL);
    if (appUrl.protocol !== 'https:' && !(appUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(appUrl.hostname))) {
      throw new Error('Invalid email verification URL');
    }
    const firebaseUrl = new URL(await admin.auth().generateEmailVerificationLink(user.email));
    const code = firebaseUrl.searchParams.get('oobCode');
    if (firebaseUrl.searchParams.get('mode') !== 'verifyEmail' || !code) {
      throw new Error('Invalid Firebase verification link');
    }
    appUrl.searchParams.set('mode', 'verifyEmail');
    appUrl.searchParams.set('oobCode', code);
    await sendVerificationMail(user.email, appUrl.toString(), user.displayName);
    res.json({ message: 'Verification email accepted by the SMTP server' });
  } catch (err) {
    console.error('Verification email failed:', err.code || 'configuration or SMTP error');
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

module.exports = router;
