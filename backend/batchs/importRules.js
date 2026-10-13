const admin = require("firebase-admin");

// Initialisation Firebase Admin
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const rules = [
  {
    "id": "3Avbmn5WDjhkbQvcsNTz",
    "cost": 2,
    "matchDay": false,
    "icon": "leaf-outline",
    "label": "Salissure"
  },
  {
    "id": "7BspPAHRat12qQruZQte",
    "cost": 10,
    "matchDay": true,
    "icon": "chatbubbles-outline",
    "label": "Contestation"
  },
  {
    "id": "8nByVZxWsUp4bgxykSiN",
    "cost": 3,
    "matchDay": false,
    "icon": "time-outline",
    "label": "Retard de paiement"
  },
  {
    "id": "AOgAsPJcNFg0To6yHtve",
    "cost": 5,
    "matchDay": true,
    "icon": "dice-outline",
    "label": "Quéquette"
  },
  {
    "id": "EljtmnPY83UZXucSvkJe",
    "cost": 2,
    "matchDay": false,
    "icon": "stopwatch-outline",
    "label": "Retard < 5'"
  },
  {
    "id": "OT8zI91HTJe9CnJPh5JC",
    "cost": 2,
    "matchDay": true,
    "icon": "tennisball-outline",
    "label": "Goodberg"
  },
  {
    "id": "WfRsIvDJowOXA28EIwLN",
    "cost": 20,
    "matchDay": true,
    "icon": "shirt-outline",
    "label": "Cartoin rouge"
  },
  {
    "id": "fpK8HKDF05ZlrSp4NrlK",
    "cost": 4,
    "matchDay": false,
    "icon": "walk-outline",
    "label": "Motion"
  },
  {
    "id": "gVvH1uixkHKYgBX3AsMe",
    "cost": 3,
    "matchDay": false,
    "icon": "calendar-number-outline",
    "label": "Retard > 10'"
  },
  {
    "id": "lVDcNgOuIHfmfljSx9Vd",
    "cost": 2,
    "matchDay": false,
    "icon": "file-tray-stacked-outline",
    "label": "Oubli"
  },
  {
    "id": "loQfMZrYuoifKvS7Cvxu",
    "cost": 3,
    "matchDay": false,
    "icon": "cash-outline",
    "label": "Radinerie"
  },
  {
    "id": "nDe1tvnRY3O5a4qlb3CQ",
    "cost": 2,
    "matchDay": false,
    "icon": "medal-outline",
    "label": "Homme du match"
  },
  {
    "id": "pSVnwSZUEaWlk7VCDmMc",
    "cost": 5,
    "matchDay": false,
    "icon": "thermometer-outline",
    "label": "Retard < 15'"
  }
]

async function importrules() {
  const batch = db.batch();

  for (const rule of rules) {
    const ruleRef = db
      .collection("seasons")
      .doc("2026")
      .collection("rules")
      .doc(rule.id);

    batch.set(ruleRef, {
      uid: rule.id,
      cost: rule.cost,
      matchDay: rule.matchDay,
      label: rule.label,
      icon: rule.icon,
      active : true
    });
  }

  await batch.commit();

  console.log(`✅ ${rules.length} règles importées dans seasons/2026/rules`);
}

importrules()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Erreur :", error);
    process.exit(1);
  });