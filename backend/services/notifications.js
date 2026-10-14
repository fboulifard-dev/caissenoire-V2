const admin = require('firebase-admin');
const { getDb } = require('../firebase-admin-init');

async function notifyPlayer(seasonId, playerId, title, body, data = {}) {
  const db = getDb();
  const [player, snapshot] = await Promise.all([
    db.collection('seasons').doc(seasonId).collection('players').doc(playerId).get(),
    db.collection('notificationTokens')
      .where('userId', '==', playerId)
      .get()
  ]);
  const playerData = player.exists ? player.data() : {};
  const tokens = [...new Set([
    playerData.fcmToken,
    ...(Array.isArray(playerData.fcmTokens) ? playerData.fcmTokens : []),
    ...snapshot.docs
      .filter(doc => doc.data().seasonId === seasonId)
      .map(doc => doc.id)
  ].filter(token => typeof token === 'string' && token.trim()))];
  if (!tokens.length) return;

  for (let offset = 0; offset < tokens.length; offset += 500) {
    const batchTokens = tokens.slice(offset, offset + 500);
    let result;
    try {
      result = await admin.messaging().sendEachForMulticast({
        tokens: batchTokens,
        notification: { title, body },
        data
      });
    } catch (error) {
      console.error(`FCM send failed for player ${playerId}:`, error.code, error.message);
      throw error;
    }

    await Promise.all(result.responses.map(async (response, index) => {
      if (response.success) return;

      const code = response.error?.code;
      console.error(`FCM token failed for player ${playerId}:`, code, response.error?.message);
      if (code !== 'messaging/registration-token-not-registered'
        && code !== 'messaging/invalid-registration-token') return;

      const staleToken = batchTokens[index];
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
      await Promise.all(cleanup);
    }));
  }
}

module.exports = { notifyPlayer };
