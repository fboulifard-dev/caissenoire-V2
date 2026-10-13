const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

const applyChanges = process.argv.includes('--apply');
const pageSize = 1000;
const concurrency = 25;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();

async function markUsersVerified(users) {
  let updated = 0;
  let failed = 0;

  for (let index = 0; index < users.length; index += concurrency) {
    const results = await Promise.allSettled(
      users.slice(index, index + concurrency).map(user =>
        auth.updateUser(user.uid, { emailVerified: true })
      )
    );

    results.forEach((result, offset) => {
      if (result.status === 'fulfilled') {
        updated++;
      } else {
        failed++;
        console.error(`Échec pour ${users[index + offset].uid}: ${result.reason.message}`);
      }
    });
  }

  return { updated, failed };
}

async function main() {
  let pageToken;
  let scanned = 0;
  let alreadyVerified = 0;
  let withoutEmail = 0;
  let pending = 0;
  let updated = 0;
  let failed = 0;

  do {
    const result = await auth.listUsers(pageSize, pageToken);
    const unverifiedUsers = result.users.filter(user => user.email && !user.emailVerified);

    scanned += result.users.length;
    alreadyVerified += result.users.filter(user => user.email && user.emailVerified).length;
    withoutEmail += result.users.filter(user => !user.email).length;

    if (applyChanges) {
      const counts = await markUsersVerified(unverifiedUsers);
      updated += counts.updated;
      failed += counts.failed;
    } else {
      pending += unverifiedUsers.length;
    }

    pageToken = result.pageToken;
  } while (pageToken);

  console.log(`Projet Firebase : ${serviceAccount.project_id}`);
  console.log(`Comptes parcourus : ${scanned}`);
  console.log(`Déjà validés : ${alreadyVerified}`);
  console.log(`Sans adresse e-mail : ${withoutEmail}`);

  if (applyChanges) {
    console.log(`Validés pendant ce batch : ${updated}`);
    console.log(`Échecs : ${failed}`);
    if (failed > 0) process.exitCode = 1;
  } else {
    console.log(`À valider : ${pending}`);
    console.log('Aucune modification. Relancer avec --apply pour valider ces comptes.');
  }
}

main()
  .catch(error => {
    console.error('Erreur pendant la validation des comptes :', error);
    process.exitCode = 1;
  })
  .finally(() => admin.app().delete());