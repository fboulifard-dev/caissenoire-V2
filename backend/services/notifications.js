const admin = require('firebase-admin');
const { getDb } = require('../firebase-admin-init');

async function notifyPlayer(seasonId, playerId, title, body, data = {}) {
  const db = getDb();
  const [player, snapshot] = await Promise.all([
    db.collection('seasons').doc(seasonId).collection('players').doc(playerId).get(),
    db.collection('notificationTokens')
      .where('seasonId', '==', seasonId)
      .where('userId', '==', playerId)
      .get()
  ]);
  const playerData = player.exists ? player.data() : {};
  const tokens = [...new Set([
    playerData.fcmToken,
    ...(Array.isArray(playerData.fcmTokens) ? playerData.fcmTokens : []),
    ...snapshot.docs.map(doc => doc.id)
  ].filter(token => typeof token === 'string' && token.trim()))];
  if (!tokens.length) return;

  const result = await admin.messaging().sendMulticast({
    tokens,
    notification: { title, body },
    data
  });
  await Promise.all(result.responses.map((response, index) => {
    if (!response.success) {
      const staleToken = tokens[index];
      const cleanup = [db.collection('notificationTokens').doc(staleToken).delete()];
      if (player.exists && (playerData.fcmToken === staleToken || playerData.fcmTokens?.includes(staleToken))) {
        const playerUpdate = {};
        if (playerData.fcmToken === staleToken) {
          playerUpdate.fcmToken = admin.firestore.FieldValue.delete();
        }
        if (playerData.fcmTokens?.includes(staleToken)) {
          playerUpdate.fcmTokens = admin.firestore.FieldValue.arrayRemove(staleToken);
        }
        cleanup.push(db.collection('seasons').doc(seasonId)
          .collection('players').doc(playerId)
          .update(playerUpdate));
      }
      return Promise.all(cleanup);
    }
    return null;
  }));
}

module.exports = { notifyPlayer };
