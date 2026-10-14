const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const defaultStorageBuckets = {
  'caissenoire-dev-84854': 'caissenoire-dev-84854.firebasestorage.app',
  'asptt-nantes-hb': 'asptt-nantes-hb.appspot.com'
};

function getFirebaseConfig() {
  try {
    return process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : {};
  } catch {
    return {};
  }
}

function firebaseOptions(projectId, credential) {
  const firebaseConfig = getFirebaseConfig();
  const resolvedProjectId = projectId || firebaseConfig.projectId;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET
    || firebaseConfig.storageBucket
    || defaultStorageBuckets[resolvedProjectId];
  return {
    ...(credential ? { credential } : {}),
    ...(resolvedProjectId ? { projectId: resolvedProjectId } : {}),
    ...(storageBucket ? { storageBucket } : {})
  };
}

function initFirebase() {
  if (!admin.apps.length) {
    const firebaseConfig = getFirebaseConfig();
    const projectId = process.env.FIREBASE_PROJECT_ID
      || process.env.GOOGLE_CLOUD_PROJECT
      || process.env.GCLOUD_PROJECT
      || firebaseConfig.projectId;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      const credential = admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n')
        });
      admin.initializeApp(firebaseOptions(projectId, credential));
      return;
    }

    const configuredKeyPath = process.env.FIREBASE_SERVICE_ACCOUNT;
    const localKeyPath = path.resolve('serviceAccountKey.json');
    const keyPath = configuredKeyPath || (fs.existsSync(localKeyPath) ? localKeyPath : null);

    if (keyPath) {
      const serviceAccount = require(path.resolve(keyPath));
      const resolvedProjectId = projectId || serviceAccount.project_id;
      admin.initializeApp(firebaseOptions(resolvedProjectId, admin.credential.cert(serviceAccount)));
    } else {
      // App Hosting supplies Application Default Credentials to the runtime.
      admin.initializeApp(firebaseOptions(projectId, null));
    }
  }
}

function getDb() {
  if (!admin.apps.length) throw new Error('Firebase not initialized');
  return admin.firestore();
}

function getStorageBucket() {
  if (!admin.apps.length) throw new Error('Firebase not initialized');
  const app = admin.app();
  const bucketName = app.options.storageBucket
    || process.env.FIREBASE_STORAGE_BUCKET
    || getFirebaseConfig().storageBucket
    || defaultStorageBuckets[app.options.projectId];
  if (!bucketName) throw new Error('FIREBASE_STORAGE_BUCKET is not configured');
  return admin.storage().bucket(bucketName);
}

module.exports = { initFirebase, getDb, getStorageBucket };
