const express = require('express');
const router = express.Router();
const { getDb } = require('../firebase-admin-init');
const { verifyToken } = require('../middleware/auth');
const { requireSeason, requireAdmin } = require('../middleware/season');
const { notifyPlayer } = require('../services/notifications');

router.use(verifyToken);
router.use(requireSeason);

router.get('/', async (req, res) => {
  try {
    const snapshot = await getDb().collection('seasons').doc(req.season.id).collection('fines').get();
    const data = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((first, second) => new Date(second.date || second.createdAt || 0).getTime() - new Date(first.date || first.createdAt || 0).getTime());
    if (req.query.playerId) {
      return res.json(data.filter(fine => fine.playerId === req.query.playerId));
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { date, playerId, ruleId, amount = 0, matchDay = false, photo, comment } = req.body;
    const player = await getDb().collection('seasons').doc(req.season.id).collection('players').doc(playerId).get();
    const rule = await getDb().collection('seasons').doc(req.season.id).collection('rules').doc(ruleId).get();
    if (!player.exists || !rule.exists) return res.status(400).json({ error: 'Invalid player or rule' });
    const ruleData = rule.data();
    const finalMatchDay = Boolean(matchDay);
    const finalAmount = finalMatchDay ? Number(ruleData.cost) * 2 : Number(ruleData.cost);
    const payload = {
      date: date || new Date().toISOString().slice(0, 10),
      playerId,
      playerName: `${player.data().firstName || ''} ${player.data().lastName || ''}`.trim() || player.data().name || playerId,
      ruleId,
      ruleLabel: ruleData.label,
      amount: Number.isFinite(finalAmount) ? finalAmount : Number(amount) || 0,
      matchDay: finalMatchDay,
      photo: photo || null,
      comment: comment || '',
      createdBy: req.user.uid,
      createdAt: new Date().toISOString()
    };
    const ref = await getDb().collection('seasons').doc(req.season.id).collection('fines').add(payload);
    try {
      await notifyPlayer(req.season.id, playerId, 'Nouvelle amende', `${ruleData.label} : ${payload.amount} EUR`, { fineId: ref.id });
    } catch (notificationError) {
      console.error('Fine notification failed:', notificationError.message);
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
    await db.collection('seasons').doc(req.season.id).collection('fines').doc(id).set(payload, { merge: true });
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    await db.collection('seasons').doc(req.season.id).collection('fines').doc(id).delete();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//module.exports = router;
