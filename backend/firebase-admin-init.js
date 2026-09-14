const admin = require('firebase-admin');

function initFirebase() {
  if (!admin.apps.length) {
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT || './serviceAccountKey.json';
    const serviceAccount = require(keyPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
}

function getDb() {
  if (!admin.apps.length) throw new Error('Firebase not initialized');
  return admin.firestore();
}

module.exports = { initFirebase, getDb };
