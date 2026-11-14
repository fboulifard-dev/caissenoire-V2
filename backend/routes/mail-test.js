const express = require('express');
const { sendTestMail } = require('../services/smtp');

const router = express.Router();
const intervalMs = 60 * 1000;
let lastAttempt = null;
let sending = false;

router.get('/test', async (req, res) => {
  if (process.env.SMTP_TEST_ENABLED !== 'true') {
    return res.status(404).json({ error: 'Email test is disabled' });
  }

  const now = Date.now();
  if (sending || (lastAttempt !== null && now - lastAttempt < intervalMs)) {
    const remaining = lastAttempt === null ? 1 : Math.max(1, Math.ceil((lastAttempt + intervalMs - now) / 1000));
    res.set('Retry-After', String(remaining));
    return res.status(429).json({ error: 'Please wait before sending another test email' });
  }
  lastAttempt = now;
  sending = true;
  try {
    await sendTestMail();
    res.json({ message: 'Test email accepted by the SMTP server' });
  } catch (err) {
    console.error('Test email failed:', err.code || 'configuration or SMTP error');
    res.status(500).json({ error: 'Failed to send test email' });
  } finally {
    sending = false;
  }
});

module.exports = router;
