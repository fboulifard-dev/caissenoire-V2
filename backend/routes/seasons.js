const express = require('express');
const router = express.Router();
const { getDb } = require('../firebase-admin-init');
const { verifyToken } = require('../middleware/auth');
const { getSeason, requireSeason, requireAdmin } = require('../middleware/season');

router.use(verifyToken);

/**
 * seasons
 * 
 */
router.get('/:seasonId', requireSeason, async (req, res) => {
  res.json({ ...req.season, player: req.player, readOnly: req.readOnly });
});

router.get('/', async (req, res) => {
  try {
    const snapshot = await getDb().collection('seasons').get();
    const seasons = await Promise.all(snapshot.docs.map(async doc => {
      const player = await doc.ref.collection('players').doc(req.user.uid).get();
      return { id: doc.id, ...doc.data(), player: player.exists ? player.data() : null };
    }));
    seasons.sort((first, second) => String(second.id).localeCompare(String(first.id), 'fr', { numeric: true }));
    // res.json(seasons.filter(season => season.player));
    res.json(seasons);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/active', requireSeason, async (req, res) => {
  res.json({ ...req.season, player: req.player });
});

router.get('/:seasonId/summary', requireSeason, async (req, res) => {
  try {
    const season = getDb().collection('seasons').doc(req.season.id);
    const [paymentsSnapshot, finesSnapshot, rulesSnapshot, playersSnapshot] = await Promise.all([
      season.collection('payments').get(),
      season.collection('fines').get(),
      season.collection('rules').get(),
      season.collection('players').get()
    ]);

    const buildSummary = (payments, fines) => {
      const paymentsTotal = payments.reduce((total, doc) => total + Number(doc.data().amount || 0), 0);
      const finesTotal = fines.reduce((total, doc) => total + Number(doc.data().amount || 0), 0);
      return {
        paymentsCount: payments.length,
        paymentsTotal,
        finesCount: fines.length,
        finesTotal,
        amountDue: finesTotal - paymentsTotal
      };
    };

    const allPayments = paymentsSnapshot.docs;
    const allFines = finesSnapshot.docs;
    const connectedPayments = allPayments.filter(doc => doc.data().playerId === req.user.uid);
    const connectedFines = allFines.filter(doc => doc.data().playerId === req.user.uid);
    const selectedPlayerId = req.query.playerId || req.user.uid;
    const selectedPayments = allPayments.filter(doc => doc.data().playerId === selectedPlayerId);
    const selectedFines = allFines.filter(doc => doc.data().playerId === selectedPlayerId);
    const global = buildSummary(allPayments, allFines);
    const connected = buildSummary(connectedPayments, connectedFines);
    const selected = buildSummary(selectedPayments, selectedFines);
    const fineRanking = playersSnapshot.docs
      .map(player => ({
        playerId: player.id,
        finesTotal: allFines
          .filter(fine => fine.data().playerId === player.id)
          .reduce((total, fine) => total + Number(fine.data().amount || 0), 0)
      }))
      .sort((first, second) => second.finesTotal - first.finesTotal);
    const selectedRankingIndex = fineRanking.findIndex(player => player.playerId === selectedPlayerId);

    res.json({
      global,
      connected,
      selected,
      selectedPlayerId,
      ...connected,
      ...selected,
      selectedRank: selectedRankingIndex >= 0 ? selectedRankingIndex + 1 : null,
      rankingSize: fineRanking.length,
      rulesCount: rulesSnapshot.size,
      playersCount: playersSnapshot.size
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:seasonId/ranking', requireSeason, async (req, res) => {
  try {
    const season = getDb().collection('seasons').doc(req.season.id);
    const [playersSnapshot, finesSnapshot, paymentsSnapshot] = await Promise.all([
      season.collection('players').get(),
      season.collection('fines').get(),
      season.collection('payments').get()
    ]);
    const ranking = playersSnapshot.docs.map(player => {
      const playerData = player.data();
      const playerFines = finesSnapshot.docs
        .filter(fine => fine.data().playerId === player.id)
        .reduce((total, fine) => total + Number(fine.data().amount || 0), 0);
      const playerPayments = paymentsSnapshot.docs
        .filter(payment => payment.data().playerId === player.id)
        .reduce((total, payment) => total + Number(payment.data().amount || 0), 0);
      return {
        playerId: player.id,
        name: `${playerData.firstName || ''} ${playerData.lastName || ''}`.trim() || playerData.name || player.id,
        finesTotal: playerFines,
        paymentsTotal: playerPayments
      };
    });
    ranking.sort((first, second) => second.finesTotal - first.finesTotal);
    res.json(ranking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * players
 */

router.get('/:seasonId/players', requireSeason, async (req, res) => {
  try {
    const snapshot = await getDb().collection('seasons').doc(req.season.id).collection('players').get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * payments
 */

router.get('/:seasonId/payments', requireSeason, requireSeason, async (req, res) => {
  try {
    const snapshot = await getDb().collection('seasons').doc(req.season.id).collection('payments').get();
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

router.post('/:seasonId/payments', requireSeason, requireAdmin, async (req, res) => {
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

router.put('/:seasonId/payments/:id', requireSeason, requireAdmin, async (req, res) => {
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

router.delete('/:seasonId/payments/:id', requireSeason, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    await db.collection('seasons').doc(req.season.id).collection('payments').doc(id).delete();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * fines
 */

router.get('/:seasonId/fines', requireSeason, async (req, res) => {
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

router.post('/:seasonId/fines',requireSeason, requireAdmin, async (req, res) => {
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

router.put('/:seasonId/fines/:id', requireSeason, requireAdmin, async (req, res) => {
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

router.delete('/:seasonId/fines/:id', requireSeason, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    await db.collection('seasons').doc(req.season.id).collection('fines').doc(id).delete();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



/**
 * rules
 */

router.get('/:seasonId/rules', requireSeason, async (req, res) => {
  try {
    const snapshot = await getDb().collection('seasons').doc(req.season.id).collection('rules').get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:seasonId/rules', requireSeason, requireAdmin, async (req, res) => {
  const { cost, matchDay, label } = req.body;
  if (!Number.isFinite(Number(cost)) || typeof matchDay !== 'boolean' || !label) {
    return res.status(400).json({ error: 'Invalid rule' });
  }

  try {
    const ref = await getDb().collection('seasons').doc(req.season.id).collection('rules').add({
      cost: Number(cost),
      matchDay,
      label: String(label).trim(),
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid
    });
    res.status(201).json({ id: ref.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:seasonId/rules/:id', requireSeason, requireAdmin, async (req, res) => {
  const { cost, matchDay, label, active } = req.body;
  if (!Number.isFinite(Number(cost)) || typeof matchDay !== 'boolean' || !label) {
    return res.status(400).json({ error: 'Invalid rule' });
  }
  try {
    await getDb().collection('seasons').doc(req.season.id).collection('rules').doc(req.params.id).set({
      cost: Number(cost), matchDay, label: String(label).trim(), active: active !== false,
      updatedAt: new Date().toISOString(), updatedBy: req.user.uid
    }, { merge: true });
    res.json({ id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
