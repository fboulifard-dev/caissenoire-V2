const admin = require('firebase-admin');
const { getDb } = require('../firebase-admin-init');

/**
 * 
 * @param {*} saisonId 
 * @param {*} playerId 
 * @returns 
 */
async function getPayments(saisonId, playerId) {
  const snapshot = await getDb().collection('seasons').doc(saisonId).collection('payments').get();
    const players = await getDb().collection('seasons').doc(saisonId).collection('players').get();

    const data = snapshot.docs
      .map(doc => {
        const payment = { id: doc.id, ...doc.data() };
        if (payment.createdBy) {
          try {
            const creator = players.docs.find(doc => doc.id === payment.createdBy);
            payment.createdByFirstName = creator.data().firstName;
            payment.createdByLastName = creator.data().lastName;
          } catch {
            payment.createdBy = payment.createdBy;
          }
        }

        if (payment.playerId) {
          try {
            const player = players.docs.find(doc => doc.id === payment.playerId);
            payment.playerFirstName = player.data().firstName;
            payment.playerLastName = player.data().lastName;
          } catch {
            payment.playerId = payment.playerId;
          }
        }

        return payment; 
      })
      .sort((first, second) => new Date(second.date || second.createdAt || 0).getTime() - new Date(first.date || first.createdAt || 0).getTime());
    let reponse = data;
    
    if (playerId) {
      reponse = data.filter(payment => payment.playerId === playerId);
    }
    return reponse;
}

/**
 * 
 * @param {*} saisonId 
 * @param {*} payment 
 * @returns 
 */
async function createPayment(saisonId, payment) {
    const db = getDb();
    const player = await db.collection('seasons').doc(saisonId).collection('players').doc(payment.playerId).get();
    if (!player.exists) {
      throw new Error({ error: 'Le joueur du paiement est invalide.' });
    }
    const numericAmount = Number(payment.amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      throw new Error({ error: 'Le montant du paiement est invalide.' });
    }

    const payload = {
      date: payment.date || new Date().toISOString().slice(0, 10),
      playerId : payment.playerId,
      amount: numericAmount,
      comment: payment.comment || '',
      createdBy: payment.creator,
      createdAt: new Date().toISOString()
    };

    return await db.collection('seasons').doc(saisonId).collection('payments').add(payload);

  
}

/**
 * 
 * @param {*} saisonId 
 * @param {*} payment 
 */
async function updatePayment(saisonId, payment) {
  const db = getDb();
  const id = payment.id;
  payment.updatedAt = new Date().toISOString();
  await db.collection('seasons').doc(saisonId).collection('payments').doc(id).set(payment, { merge: true });
}

/**
 * 
 * @param {*} saisonId 
 * @param {*} paymentId 
 */
async function deletePayment(saisonId, paymentId) {
  const db = getDb();
  await db.collection('seasons').doc(saisonId).collection('payments').doc(paymentId).delete();
}

module.exports = { getPayments, createPayment, updatePayment, deletePayment };
