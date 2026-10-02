const express = require('express');
const router = express.Router();
const { getDb } = require('../firebase-admin-init');
const { verifyToken } = require('../middleware/auth');
const { getActiveSeason, requireSeason, requireAdmin } = require('../middleware/season');
const { notifyPlayer } = require('../services/notifications');
const { getFines, createFine, updateFine, deleteFine } = require('../services/fines');
const { getPayments, createPayment, updatePayment, deletePayment } = require('../services/payments');

router.use(verifyToken);

router.get('/participation/active', async (req, res) => {
  try {
    const season = await getActiveSeason();
    const response = await getDb().collection('seasons').doc(season.id)
      .collection('participationResponses').doc(req.user.uid).get();
    res.json({
      season: { id: season.id, name: season.name || season.id },
      participating: response.exists ? response.data().participating : null,
      notificationsEnabled: response.exists ? response.data().notificationsEnabled ?? null : null
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/participation/active', async (req, res) => {
  try {
    if (typeof req.body.participating !== 'boolean') {
      return res.status(400).json({ error: 'A participation decision is required' });
    }

    const season = await getActiveSeason();
    const seasonRef = getDb().collection('seasons').doc(season.id);
    const playerRef = seasonRef.collection('players').doc(req.user.uid);
    const responseRef = seasonRef.collection('participationResponses').doc(req.user.uid);
    const existingResponse = await responseRef.get();
    if (existingResponse.exists) {
      const savedResponse = existingResponse.data();
      return res.json({
        participating: savedResponse.participating,
        notificationsEnabled: savedResponse.notificationsEnabled ?? null
      });
    }

    const now = new Date().toISOString();

    if (req.body.participating) {
      const player = await playerRef.get();
      if (!player.exists) {
        const displayName = String(req.user.name || '').trim();
        const nameParts = displayName.split(/\s+/).filter(Boolean);
        const email = String(req.user.email || '');
        await playerRef.set({
          email,
          firstName: nameParts[0] || email.split('@')[0] || 'Joueur',
          lastName: nameParts.slice(1).join(' '),
          nickName: '',
          roles: []
        });
      }
    }

    await responseRef.set({
      participating: req.body.participating,
      notificationsEnabled: req.body.participating ? null : false,
      answeredAt: now,
      updatedAt: now
    }, { merge: true });
    res.json({
      participating: req.body.participating,
      notificationsEnabled: req.body.participating ? null : false
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/participation/active/notifications', async (req, res) => {
  try {
    if (typeof req.body.enabled !== 'boolean') {
      return res.status(400).json({ error: 'A notification decision is required' });
    }

    const season = await getActiveSeason();
    const responseRef = getDb().collection('seasons').doc(season.id)
      .collection('participationResponses').doc(req.user.uid);
    const response = await responseRef.get();
    if (!response.exists || response.data().participating !== true) {
      return res.status(403).json({ error: 'Season participation is required' });
    }

    await responseRef.set({ notificationsEnabled: req.body.enabled, updatedAt: new Date().toISOString() }, { merge: true });
    res.json({ notificationsEnabled: req.body.enabled });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/notification-token', async (req, res) => {
  try {
    const { seasonId, token } = req.body;
    if (typeof token !== 'string' || !token.trim() || typeof seasonId !== 'string') {
      return res.status(400).json({ error: 'A valid notification token and season are required' });
    }

    const season = await getActiveSeason();
    if (season.id !== seasonId) {
      return res.status(403).json({ error: 'Notification token season does not match the active season' });
    }
    const response = await getDb().collection('seasons').doc(season.id)
      .collection('participationResponses').doc(req.user.uid).get();
    if (!response.exists || response.data().participating !== true || response.data().notificationsEnabled !== true) {
      return res.status(403).json({ error: 'Notification consent is required' });
    }

    await getDb().collection('notificationTokens').doc(token.trim()).set({
      userId: req.user.uid,
      seasonId: season.id,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    res.status(204).end();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/active', requireSeason, async (req, res) => {
  res.json({ ...req.season, player: req.player });
});

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

/*****************************************************************************
 * players
 *****************************************************************************/

router.get('/:seasonId/players', requireSeason, async (req, res) => {
  try {
    const snapshot = await getDb().collection('seasons').doc(req.season.id).collection('players').get();
    res.json(
      snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((first, second) => {
      const firstName = `${first.firstName || ''} ${first.lastName || ''}`.trim() || first.name || first.email || first.id;
      const secondName = `${second.firstName || ''} ${second.lastName || ''}`.trim() || second.name || second.email || second.id;
      return firstName.localeCompare(secondName, 'fr');
      } )
  );   
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:seasonId/players', requireSeason, async (req, res) => {
  try {
    const { id, email, firstName, lastName, nickName } = req.body;
    const payload = {
      id: id ,
      email: email || '',
      firstName: firstName || '',
      lastName: lastName || '',
      nickName: nickName || '',
    };
    const snapshot = await getDb().collection('seasons').doc(req.season.id).collection('players').add(payload);
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*****************************************************************************
 * payments
 *****************************************************************************/

router.get('/:seasonId/payments', requireSeason, requireSeason, async (req, res) => {
  try {
    const data = await getPayments(req.season.id, req.query.playerId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:seasonId/payments', requireSeason, requireAdmin, async (req, res) => {
  try {
    const payment = {...req.body, creator : req.user.uid};

    const data = await createPayment(req.season.id, payment);
    try {
      await notifyPlayer(
        req.season.id,
        payment.playerId,
        'Nouveau paiement',
        `Un paiement de ${Number(payment.amount).toFixed(2)} EUR vous a été attribué.`,
        { type: 'payment', paymentId: data.id }
      );
    } catch (notificationError) {
      console.error('Payment notification failed:', notificationError.message);
    }

    res.status(201).json({ id: data.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:seasonId/payments/:id', requireSeason, requireAdmin, async (req, res) => {
  try {
    const payment = {...req.body, id : req.params.id};
    await updatePayment(req.season.id, payment);
    res.json(payment.id );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:seasonId/payments/:id', requireSeason, requireAdmin, async (req, res) => {
  try {
    const paymentId = req.params.id;
    await deletePayment(req.season.id, paymentId)
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*****************************************************************************
 * fines
 *****************************************************************************/

router.get('/:seasonId/fines', requireSeason, async (req, res) => {
  try {

    const data = await getFines(req.season.id, req.query.playerId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:seasonId/fines',requireSeason, requireAdmin, async (req, res) => {
  try {
    const fine = {...req.body, creator : req.user.uid};
    const requestedPlayerIds = Array.isArray(fine.playerIds) ? fine.playerIds : (fine.playerId ? [fine.playerId] : []);
    const selectedPlayerIds = [...new Set(requestedPlayerIds.filter(id => typeof id === 'string' && id.trim()))];
    if (!selectedPlayerIds.length || typeof fine.ruleId !== 'string' || !fine.ruleId.trim()) {
      return res.status(400).json({ error: 'At least one player and one rule are required' });
    }
    const createdFines = await createFine(req.season.id, fine, selectedPlayerIds);
    await Promise.all(createdFines.map(async createdFine => {
      try {
        await notifyPlayer(
          req.season.id,
          createdFine.playerId,
          'Nouvelle amende',
          `Une amende de ${Number(createdFine.amount).toFixed(2)} EUR vous a été attribuée.`,
          { type: 'fine', fineId: createdFine.id }
        );
      } catch (notificationError) {
        console.error('Fine notification failed:', notificationError.message);
      }
    }));
    res.status(201).json({ ids: createdFines.map(fine => fine.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:seasonId/fines/:id', requireSeason, requireAdmin, async (req, res) => {
  try {
    const fine = {...req.body, id : req.params.id};
    await updateFine(req.season.id, fine)
    res.json(fine.id);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:seasonId/fines/:id', requireSeason, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    await deleteFine(req.season.id, id)
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



/*****************************************************************************
 * rules
 *****************************************************************************/

router.get('/:seasonId/rules', requireSeason, async (req, res) => {
  try {
    const snapshot = await getDb().collection('seasons').doc(req.season.id).collection('rules').get();
    res.json(
      snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((first, second) => {
           return first.label.localeCompare(second.label, 'fr')
      } )
    );
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
