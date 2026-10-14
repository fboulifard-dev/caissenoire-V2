const admin = require('firebase-admin');
const { getDb, getStorageBucket } = require('../firebase-admin-init');

function getManagedPhoto(photoUrl, seasonId) {
  if (typeof photoUrl !== 'string' || !photoUrl) return null;

  try {
    const bucket = getStorageBucket();
    const url = new URL(photoUrl);
    const objectPrefix = `/v0/b/${bucket.name}/o/`;
    if (url.hostname !== 'firebasestorage.googleapis.com' || !url.pathname.startsWith(objectPrefix)) return null;

    const objectPath = decodeURIComponent(url.pathname.slice(objectPrefix.length));
    return objectPath.startsWith(`seasons/${seasonId}/fine-photos/`)
      ? { bucket, objectPath }
      : null;
  } catch {
    return null;
  }
}

async function deleteFinePhotoIfUnused(seasonId, photoUrl) {
  const managedPhoto = getManagedPhoto(photoUrl, seasonId);
  if (!managedPhoto) return;

  const references = await getDb().collection('seasons').doc(seasonId)
    .collection('fines').where('photo', '==', photoUrl).limit(1).get();
  if (!references.empty) return;

  try {
    await managedPhoto.bucket.file(managedPhoto.objectPath).delete({ ignoreNotFound: true });
  } catch (error) {
    console.error('Fine photo cleanup failed:', error.message);
  }
}

/**
 * 
 * @param {*} saisonId 
 * @param {*} playerId 
 * @returns 
 */
async function getFines(saisonId, playerId) {
  const snapshot = await getDb().collection('seasons').doc(saisonId).collection('fines').get();
  const players = await getDb().collection('seasons').doc(saisonId).collection('players').get();
  const rules = await getDb().collection('seasons').doc(saisonId).collection('rules').get();
  const data = snapshot.docs
    .map(doc => {
        const fine = { id: doc.id, ...doc.data() };
        if (fine.createdBy) {
          try {
            const creator = players.docs.find(doc => doc.id === fine.createdBy);
            fine.createdByFirstName = creator.data().firstName;
            fine.createdByLastName = creator.data().lastName;
          } catch {
            fine.createdBy = fine.createdBy;
          }
        }

        if (fine.playerId) {
          try {
            const player = players.docs.find(doc => doc.id === fine.playerId);
            fine.playerFirstName = player.data().firstName;
            fine.playerLastName = player.data().lastName;
          } catch {
            fine.playerId = fine.playerId;
          }
        }

        if (fine.ruleId) {
          try {
            const rule = rules.docs.find(doc => doc.id === fine.ruleId);
            fine.ruleLabel = rule.data().label  ;
          } catch {
            fine.ruleId = fine.ruleId;
          }
        }

        return fine; 
      })
      .sort((first, second) => new Date(second.date || second.createdAt || 0).getTime() - new Date(first.date || first.createdAt || 0).getTime());
    
    let reponse = data;

      if (playerId) {
      reponse = data.filter(fine => fine.playerId === playerId);
    }
    
    return reponse;
}

/**
 * 
 * @param {*} saisonId 
 * @param {*} fine 
 * @param {*} playersId 
 * @returns 
 */
async function createFine(saisonId, fine, playersId) {
    
    const db = getDb();
    const playersRef = db.collection('seasons').doc(saisonId).collection('players');
    const players = await Promise.all(playersId.map(id => playersRef.doc(id).get()));
    const rule = await db.collection('seasons').doc(saisonId).collection('rules').doc(fine.ruleId).get();
    if (players.some(player => !player.exists) || !rule.exists) throw new Error('Invalid player or rule');
    const ruleData = rule.data();
    const finalMatchDay = Boolean(fine.matchDay);
    const finesRef = db.collection('seasons').doc(saisonId).collection('fines');
    const createdAt = new Date().toISOString();
    const batch = db.batch();
    const createdFines = players.map((player, index) => {
      const selectedId = playersId[index];
      const payload = {
        date: fine.date || new Date().toISOString().slice(0, 10),
        playerId: selectedId,
        playerName: `${player.data().firstName || ''} ${player.data().lastName || ''}`.trim() || player.data().name || selectedId,
        ruleId : fine.ruleId,
        ruleLabel: ruleData.label,
        amount: fine.amount || 0,
        matchDay: finalMatchDay,
        photo: fine.photo || null,
        comment: fine.comment || '',
        createdBy: fine.creator,
        createdAt: createdAt
      };
      const ref = finesRef.doc();
      batch.set(ref, payload);
      return { id: ref.id, playerId: selectedId, amount: payload.amount };
    });
    await batch.commit();
    
    return createdFines;
  
}

/**
 * 
 * @param {*} saisonId 
 * @param {*} fine 
 */
async function updateFine(saisonId, fine) {
  const db = getDb();
  const id = fine.id;
  const fineRef = db.collection('seasons').doc(saisonId).collection('fines').doc(id);
  const existingFine = await fineRef.get();
  const previousPhoto = existingFine.data()?.photo;
  fine.updatedAt = new Date().toISOString();
  await fineRef.set(fine, { merge: true });
  if (previousPhoto && Object.prototype.hasOwnProperty.call(fine, 'photo') && previousPhoto !== fine.photo) {
    await deleteFinePhotoIfUnused(saisonId, previousPhoto);
  }
}

/**
 * 
 * @param {*} saisonId 
 * @param {*} fineId 
 */
async function deleteFine(saisonId, fineId) {
  const db = getDb();
  const fineRef = db.collection('seasons').doc(saisonId).collection('fines').doc(fineId);
  const existingFine = await fineRef.get();
  const photoUrl = existingFine.data()?.photo;
  await fineRef.delete();
  if (photoUrl) {
    await deleteFinePhotoIfUnused(saisonId, photoUrl);
  }
}

module.exports = { getFines, createFine, updateFine, deleteFine };
