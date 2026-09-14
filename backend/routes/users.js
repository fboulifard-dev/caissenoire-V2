const express = require('express');
const router = express.Router();
const { getDb } = require('../firebase-admin-init');
const { verifyToken } = require('../middleware/auth');
const { requireSeason } = require('../middleware/season');

router.use(verifyToken);
router.use(requireSeason);

router.get('/', async (req, res) => {
  try {
    const snapshot = await getDb()
      .collection('seasons').doc(req.season.id).collection('players').get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    users.sort((first, second) => {
      const firstName = `${first.firstName || ''} ${first.lastName || ''}`.trim() || first.name || first.email || first.id;
      const secondName = `${second.firstName || ''} ${second.lastName || ''}`.trim() || second.name || second.email || second.id;
      return firstName.localeCompare(secondName, 'fr');
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
