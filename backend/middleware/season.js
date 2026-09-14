const { getDb } = require('../firebase-admin-init');

async function getActiveSeason() {
  const snapshot = await getDb().collection('seasons').get();
  const activeSeasons = snapshot.docs.filter(doc => doc.data().active === true);
  if (activeSeasons.length !== 1) {
    const error = new Error(activeSeasons.length === 0
      ? 'No active season'
      : 'Multiple active seasons are not allowed');
    error.status = 404;
    throw error;
  }

  const active = activeSeasons[0];
  return { id: active.id, ...active.data() };
}

async function getSeason(seasonId) {
  const ref = getDb().collection('seasons').doc(String(seasonId));
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    const error = new Error('Season not found');
    error.status = 404;
    throw error;
  }
  return { id: snapshot.id, ...snapshot.data() };
}

async function requireSeason(req, res, next) {
  try {
    const requestedSeasonId = req.query.seasonId || req.params.seasonId;
    const season = requestedSeasonId
      ? await getSeason(requestedSeasonId)
      : await getActiveSeason();
    const playerSnapshot = await getDb()
      .collection('seasons').doc(season.id)
      .collection('players').doc(req.user.uid).get();

    if (!playerSnapshot.exists) {
      return res.status(403).json({ error: 'User is not a player in the active season' });
    }

    req.season = season;
    req.player = { id: playerSnapshot.id, ...playerSnapshot.data() };
    req.readOnly = season.active !== true;
    next();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

function requireAdmin(req, res, next) {
  if (req.readOnly) {
    return res.status(403).json({ error: 'Inactive seasons are read-only' });
  }
  if (!req.player || !Array.isArray(req.player.roles) || !req.player.roles.includes('ADMIN')) {
    return res.status(403).json({ error: 'Admin role required' });
  }
  next();
}

module.exports = { getActiveSeason, getSeason, requireSeason, requireAdmin };
