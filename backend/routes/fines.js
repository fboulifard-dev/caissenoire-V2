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
    const { date, playerIds = [], ruleId, amount = 0, matchDay = false, photo, comment } = req.body;
    const requestedPlayerIds = Array.isArray(playerIds) ? playerIds :  [];
    const selectedPlayerIds = [...new Set(requestedPlayerIds.filter(id => typeof id === 'string' && id.trim()))];
    if (!selectedPlayerIds.length || typeof ruleId !== 'string' || !ruleId.trim()) {
      return res.status(400).json({ error: 'At least one player and one rule are required' });
    }

    const playersRef = getDb().collection('seasons').doc(req.season.id).collection('players');
    const players = await Promise.all(selectedPlayerIds.map(id => playersRef.doc(id).get()));
    const rule = await getDb().collection('seasons').doc(req.season.id).collection('rules').doc(ruleId).get();
    if (players.some(player => !player.exists) || !rule.exists) return res.status(400).json({ error: 'Invalid player or rule' });
    const ruleData = rule.data();
    const finalMatchDay = Boolean(matchDay);
    const finalAmount = finalMatchDay ? Number(ruleData.cost) * 2 : Number(ruleData.cost);
    const finesRef = getDb().collection('seasons').doc(req.season.id).collection('fines');
    const createdAt = new Date().toISOString();
    const batch = getDb().batch();
    const createdFines = players.map((player, index) => {
      const selectedId = selectedPlayerIds[index];
      const payload = {
        date: date || new Date().toISOString().slice(0, 10),
        playerId: selectedId,
        playerFirstName: player.data().playerFirstName || '',
        playerLastName: player.data().playerLastName || '',
        ruleId,
        ruleLabel: ruleData.label,
        amount: Number.isFinite(finalAmount) ? finalAmount : Number(amount) || 0,
        matchDay: finalMatchDay,
        photo: photo || null,
        comment: comment || '',
        createdBy: req.user.uid,
        createdAt
      };
      const ref = finesRef.doc();
      batch.set(ref, payload);
      return { id: ref.id, playerId: selectedId, amount: payload.amount };
    });
    await batch.commit();
    await Promise.all(createdFines.map(async fine => {
      try {
        await notifyPlayer(req.season.id, fine.playerId, 'Nouvelle amende', `${ruleData.label} : ${fine.amount} EUR`, { fineId: fine.id });
      } catch (notificationError) {
        console.error('Fine notification failed:', notificationError.message);
      }
    }));
    res.status(201).json({ ids: createdFines.map(fine => fine.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    
    const rule = await getDb().collection('seasons').doc(req.season.id).collection('rules').doc(req.body.ruleId).get();
    const player = await getDb().collection('seasons').doc(req.season.id).collection('players').doc(req.body.playerId).get();
    
    const payload = {
        date: req.body.date,
        playerId: req.body.playerId,
        playerFirstName: player.data().playerFirstName || '',
        playerLastName: player.data().playerLastName || '',
        ruleId: req.body.ruleId,
        ruleLabel: rule.data().label,
        amount: Number.isFinite(finalAmount) ? finalAmount : Number(req.body.amount) || 0,
        matchDay: req.body.matchDay,
        photo: req.body.photo || null,
        comment: req.body.comment || '',
        createdBy: req.user.uid,
        createdAt
      };
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
