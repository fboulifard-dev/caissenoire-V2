const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function initFirebase() {
  if (!admin.apps.length) {
    const configuredKeyPath = process.env.FIREBASE_SERVICE_ACCOUNT;
    const localKeyPath = path.resolve('serviceAccountKey.json');
    const keyPath = configuredKeyPath || (fs.existsSync(localKeyPath) ? localKeyPath : null);

    if (keyPath) {
      const serviceAccount = require(path.resolve(keyPath));
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
      // App Hosting supplies Application Default Credentials to the runtime.
      admin.initializeApp();
    }
  }
}

function getDb() {
  if (!admin.apps.length) throw new Error('Firebase not initialized');
  return admin.firestore();
}

module.exports = { initFirebase, getDb };
