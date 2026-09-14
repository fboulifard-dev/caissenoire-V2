require('dotenv').config();
const { initFirebase, getDb } = require('./firebase-admin-init');

async function seed() {
  initFirebase();
  const db = getDb();

  const fines = [
    { title: 'Excès de vitesse', description: '50 km/h en zone 30', amount: '80 EUR' },
    { title: 'Stationnement interdit', description: 'Rue principale', amount: '40 EUR' }
  ];

  const payments = [
    { reference: 'PAY-001', date: '2026-08-01', amount: '80 EUR' }
  ];

  for (const f of fines) {
    await db.collection('fines').add({ ...f, createdAt: new Date().toISOString() });
  }
  for (const p of payments) {
    await db.collection('payments').add({ ...p, createdAt: new Date().toISOString() });
  }
  console.log('Seed complete');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
