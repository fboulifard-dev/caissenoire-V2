const { test } = require('node:test');
const assert = require('node:assert/strict');
const admin = require('firebase-admin');
const { initializeApp, deleteApp } = require('firebase/app');
const { connectFirestoreEmulator, doc, getDoc, getFirestore, setDoc, updateDoc, deleteDoc, terminate } = require('firebase/firestore');

test('Firestore clients cannot bypass the fine API while other access remains available',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async (t) => {
    const projectId = 'demo-caissenoire';
    const adminApp = admin.initializeApp({ projectId }, 'rules-test');
    const clientApp = initializeApp({ projectId, apiKey: 'demo' }, 'rules-test');
    const db = getFirestore(clientApp);
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
    connectFirestoreEmulator(db, host, Number(port), { mockUserToken: { sub: 'player', user_id: 'player' } });

    const season = `rules-test-${Date.now()}`;
    const finePath = `seasons/${season}/fines/fine`;
    const otherPath = `seasons/${season}/players/player`;
    const fineRef = doc(db, finePath);
    const otherRef = doc(db, otherPath);
    t.after(async () => {
      await adminApp.firestore().doc(finePath).delete();
      await adminApp.firestore().doc(otherPath).delete();
      await terminate(db);
      await deleteApp(clientApp);
      await adminApp.delete();
    });

    await adminApp.firestore().doc(finePath).set({ favorite: false, amount: 10 });
    assert.equal((await getDoc(fineRef)).data().favorite, false);
    await assert.rejects(updateDoc(fineRef, { favorite: true }), { code: 'permission-denied' });
    await assert.rejects(deleteDoc(fineRef), { code: 'permission-denied' });
    await assert.rejects(setDoc(doc(db, `seasons/${season}/fines/new`), { amount: 1 }), { code: 'permission-denied' });
    await setDoc(otherRef, { name: 'Test' });
    await adminApp.firestore().doc(finePath).update({ favorite: true });
    assert.equal((await adminApp.firestore().doc(finePath).get()).data().favorite, true);
  });
