const admin = require('firebase-admin');
const { getDb } = require('../firebase-admin-init');

async function notifyPlayer(seasonId, playerId, title, body, data = {}) {
  const snapshot = await getDb().collection('notificationTokens').get();
  const tokens = snapshot.docs
    .filter(doc => doc.data().seasonId === seasonId && doc.data().userId === playerId)
    .map(doc => doc.id);
  if (!tokens.length) return;

  const result = await admin.messaging().sendMulticast({
    tokens,
    notification: { title, body },
    data
  });
  await Promise.all(result.responses.map((response, index) => {
    if (!response.success) {
      return getDb().collection('notificationTokens').doc(tokens[index]).delete();
    }
    return null;
  }));
}

module.exports = { notifyPlayer };
