require('dotenv').config();

const admin = require('firebase-admin');
const { initFirebase, getDb } = require('../firebase-admin-init');

const applyChanges = process.argv.includes('--apply');
const legacyIcons = {
  '3Avbmn5WDjhkbQvcsNTz': 'leaf-outline',
  '7BspPAHRat12qQruZQte': 'chatbubbles-outline',
  '8nByVZxWsUp4bgxykSiN': 'time-outline',
  'AOgAsPJcNFg0To6yHtve': 'dice-outline',
  'EljtmnPY83UZXucSvkJe': 'stopwatch-outline',
  'OT8zI91HTJe9CnJPh5JC': 'tennisball-outline',
  'WfRsIvDJowOXA28EIwLN': 'shirt-outline',
  'fpK8HKDF05ZlrSp4NrlK': 'walk-outline',
  'gVvH1uixkHKYgBX3AsMe': 'calendar-number-outline',
  'lVDcNgOuIHfmfljSx9Vd': 'file-tray-stacked-outline',
  'loQfMZrYuoifKvS7Cvxu': 'cash-outline',
  'nDe1tvnRY3O5a4qlb3CQ': 'medal-outline',
  'pSVnwSZUEaWlk7VCDmMc': 'thermometer-outline'
};
const fallbackIcons = [
  'leaf-outline', 'chatbubbles-outline', 'time-outline', 'dice-outline',
  'stopwatch-outline', 'tennisball-outline', 'shirt-outline', 'walk-outline',
  'calendar-number-outline', 'file-tray-stacked-outline', 'cash-outline',
  'medal-outline', 'thermometer-outline', 'alert-circle-outline'
];

async function main() {
  initFirebase();
  const db = getDb();
  let updatedCount = 0;

  try {
    const seasons = await db.collection('seasons').get();
    for (const season of seasons.docs) {
      const rules = await season.ref.collection('rules').get();
      const usedIcons = new Set(rules.docs
        .map(rule => rule.data().icon)
        .filter(icon => typeof icon === 'string' && icon));
      const missingRules = rules.docs
        .filter(rule => typeof rule.data().icon !== 'string' || !rule.data().icon)
        .sort((first, second) => first.id.localeCompare(second.id));
      const updates = missingRules.map((rule, index) => {
        const preferredIcon = legacyIcons[rule.id];
        const icon = preferredIcon && !usedIcons.has(preferredIcon)
          ? preferredIcon
          : fallbackIcons.find(candidate => !usedIcons.has(candidate)) || fallbackIcons[index % fallbackIcons.length];
        usedIcons.add(icon);
        return { ref: rule.ref, icon };
      });

      updatedCount += updates.length;
      if (applyChanges) {
        for (let index = 0; index < updates.length; index += 400) {
          const batch = db.batch();
          updates.slice(index, index + 400).forEach(({ ref, icon }) => {
            batch.set(ref, { icon }, { merge: true });
          });
          await batch.commit();
        }
      }

      console.log(`${season.id}: ${updates.length} règle(s) ${applyChanges ? 'mise(s) à jour' : 'à compléter'}`);
    }

    console.log(`Total : ${updatedCount} règle(s) ${applyChanges ? 'mise(s) à jour' : 'à compléter'}`);
    if (!applyChanges) console.log('Aucune modification. Relancer avec --apply pour enregistrer les icônes.');
  } finally {
    await admin.app().delete();
  }
}

main().catch(error => {
  console.error('Erreur pendant l’affectation des icônes :', error);
  process.exitCode = 1;
});