const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();
const { getDb } = require('../firebase-admin-init');
const { verifyToken } = require('../middleware/auth');
const { requireSeason, requireAdmin } = require('../middleware/season');
const { notifyPlayer } = require('../services/notifications');

router.use(verifyToken);
router.use(requireSeason);

router.post('/device-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string' || token.length > 4096) {
      return res.status(400).json({ error: 'Token de notification invalide.' });
    }

    await getDb().collection('notificationTokens').doc(token).set({
      token,
      seasonId: req.season.id,
      userId: req.user.uid,
      updatedAt: new Date().toISOString()
    });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection('seasons').doc(req.season.id).collection('payments').get();
    let data = await Promise.all(snapshot.docs.map(async doc => {
      const payment = { id: doc.id, ...doc.data() };

      if (!payment.createdByName && payment.createdBy) {
        try {
          const creator = await admin.auth().getUser(payment.createdBy);
          payment.createdByName = creator.displayName || creator.email || payment.createdBy;
        } catch {
          payment.createdByName = payment.createdBy;
        }
      }

      return payment;
    }));

    if (req.query.creator) {
      data = data.filter(payment =>
        payment.createdBy === req.query.creator || payment.createdByName === req.query.creator
      );
    }
    if (req.query.playerId) {
      data = data.filter(payment => payment.playerId === req.query.playerId);
    }

    data.sort((first, second) =>
      new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime()
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const { date, playerId, amount, comment, imageData } = req.body;

    const player = await db.collection('seasons').doc(req.season.id).collection('players').doc(playerId).get();
    if (!player.exists) {
      return res.status(400).json({ error: 'Le joueur du paiement est invalide.' });
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return res.status(400).json({ error: 'Le montant du paiement est invalide.' });
    }

    if (imageData && (
      typeof imageData !== 'string' ||
      !/^data:image\/(jpeg|png|webp);base64,/.test(imageData) ||
      imageData.length > 900000
    )) {
      return res.status(400).json({ error: 'Image invalide ou trop volumineuse.' });
    }

    const payload = {
      date: date || new Date().toISOString().slice(0, 10),
      playerId,
      playerName: `${player.data().firstName || ''} ${player.data().lastName || ''}`.trim() || player.data().name || playerId,
      amount: numericAmount,
      comment: comment || '',
      createdBy: req.user.uid,
      createdAt: new Date().toISOString()
    };
    if (imageData) {
      payload.imageData = imageData;
    }
    payload.createdByName = req.user.name || req.user.email || req.user.uid;
    const ref = await db.collection('seasons').doc(req.season.id).collection('payments').add(payload);

    try {
      await notifyPlayer(req.season.id, playerId, 'Nouveau paiement', `Nouveau paiement de ${numericAmount} EUR`, { paymentId: ref.id });
    } catch (notificationError) {
      console.error('Payment notification failed:', notificationError.message);
    }

    res.status(201).json({ id: ref.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    const payload = req.body;
    payload.updatedAt = new Date().toISOString();
    await db.collection('seasons').doc(req.season.id).collection('payments').doc(id).set(payload, { merge: true });
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    await db.collection('seasons').doc(req.season.id).collection('payments').doc(id).delete();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//module.exports = router;
