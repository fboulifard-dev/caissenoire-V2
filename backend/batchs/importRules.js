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
    "defaultMatch": false,
    "label": "Salissure"
  },
  {
    "id": "7BspPAHRat12qQruZQte",
    "cost": 10,
    "defaultMatch": true,
    "label": "Contestation"
  },
  {
    "id": "8nByVZxWsUp4bgxykSiN",
    "cost": 3,
    "defaultMatch": false,
    "label": "Retard de paiement"
  },
  {
    "id": "AOgAsPJcNFg0To6yHtve",
    "cost": 5,
    "defaultMatch": true,
    "label": "Quéquette"
  },
  {
    "id": "EljtmnPY83UZXucSvkJe",
    "cost": 2,
    "defaultMatch": false,
    "label": "Retard < 5'"
  },
  {
    "id": "OT8zI91HTJe9CnJPh5JC",
    "cost": 2,
    "defaultMatch": true,
    "label": "Goodberg"
  },
  {
    "id": "WfRsIvDJowOXA28EIwLN",
    "cost": 20,
    "defaultMatch": true,
    "label": "Cartoin rouge"
  },
  {
    "id": "fpK8HKDF05ZlrSp4NrlK",
    "cost": 4,
    "defaultMatch": false,
    "label": "Motion"
  },
  {
    "id": "gVvH1uixkHKYgBX3AsMe",
    "cost": 3,
    "defaultMatch": false,
    "label": "Retard > 10'"
  },
  {
    "id": "lVDcNgOuIHfmfljSx9Vd",
    "cost": 2,
    "defaultMatch": false,
    "label": "Oubli"
  },
  {
    "id": "loQfMZrYuoifKvS7Cvxu",
    "cost": 3,
    "defaultMatch": false,
    "label": "Radinerie"
  },
  {
    "id": "nDe1tvnRY3O5a4qlb3CQ",
    "cost": 2,
    "defaultMatch": false,
    "label": "Homme du match"
  },
  {
    "id": "pSVnwSZUEaWlk7VCDmMc",
    "cost": 5,
    "defaultMatch": false,
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
      defaultMatch: rule.defaultMatch,
      label: rule.label,
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