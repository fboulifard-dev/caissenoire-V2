const admin = require("firebase-admin");

// Initialisation Firebase Admin
const serviceAccount = require("./dev-serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const players = [
  {
    uid: "zjvnZVd7YUWGbeVHUj2uqYHLtcf2",
    firstName: "alexandre",
    email: "alexandre.couloir@gmail.com",
    nickName: "alex",
    lastName: "couloir",
  },
  {
    uid: "imPqpb4QodNbur8A2402Y0ViqtU2",
    firstName: "nathan",
    email: "nathan.noumowe@gmail.com",
    nickName: "noumox",
    lastName: "noumowe",
  },
  {
    uid: "T2u3qJAVmxaEQTtSR53ldAAQWDk2",
    firstName: "odelin",
    email: "o2l1baubineau@gmail.com",
    nickName: "o2",
    lastName: "baubineau",
  },
  {
    uid: "W6OaWBB73yYfVAZcMwapwKeGN3G3",
    firstName: "kévin",
    email: "kevinmerit@hotmail.fr",
    nickName: "kev",
    lastName: "merit",
  },
  {
    uid: "x1a3efMWZyUAnzjlhv73DK1ijxg2",
    firstName: "romain",
    email: "romain.lamirault@hotmail.fr",
    nickName: "miro",
    lastName: "lamirault",
  },
  {
    uid: "GHGR9vlmWHP1RUpFrykHyoWUao53",
    firstName: "gaspard",
    email: "gaspardmartinpenardg7@gmail.com",
    nickName: "gasp",
    lastName: "martin penard",
  },
  {
    uid: "HF7TqiV8ajZ5dF3vTqqSdmZu4ht2",
    firstName: "estébane",
    email: "estebane.gouhey@gmail.com",
    nickName: "st",
    lastName: "gouhey",
  },
  {
    uid: "RxCeoNlkiQTp3lzwRlqlN8FFAld2",
    firstName: "pierrick",
    email: "royer.pierrick@gmail.com",
    nickName: "pierrick",
    lastName: "royer",
  },
  {
    uid: "q1gmRkXPx0WIltpNhcovU0RI1X43",
    firstName: "arnaud",
    email: "goacolou.arnaud@gmail.com",
    nickName: "nono",
    lastName: "goacolou",
  },
  {
    uid: "iWw4sZUo6lZLYlVJhsK3Jsjy0cH2",
    firstName: "julien",
    email: "julientessier5@gmail.com",
    nickName: "tess",
    lastName: "tessier",
  },
  {
    uid: "r2VQWG7glterTCdxOWGdNfwHewm1",
    firstName: "basile",
    email: "basile.bolcato@gmail.com",
    nickName: "baz",
    lastName: "bolcato",
  },
  {
    uid: "TSY4IqLIqoWG6f6UhVOsXvyQmnc2",
    firstName: "baptiste",
    email: "baubineau.baptiste@gmail.com",
    nickName: "baptiste",
    lastName: "Baubineau",
  },
  {
    uid: "XN33ZCiXKsVWi6j34URzz7nlLYq2",
    firstName: "legault",
    email: "anatolelegault@gmail.com",
    nickName: "anat",
    lastName: "anatole",
  },
  {
    uid: "DkxnMTfHHCXxECTwKQJx0UJt1FI3",
    firstName: "emile",
    email: "emile.miot@gmail.com",
    nickName: "emile",
    lastName: "miot",
  },
  {
    uid: "jnHag6vVpYZGlRMEPek7a6sA1GD2",
    firstName: "anthony",
    email: "hate.anthony.ha@gmail.com",
    nickName: "grantho",
    lastName: "haté",
  },
  {
    uid: "93lQ1dUdQROHAWxXugCywoP4mFZ2",
    firstName: "vincent",
    email: "vincent.garnier11@gmail.com",
    nickName: "vincent",
    lastName: "garnier",
  },
  {
    uid: "rro3OQIjAeZqeZMsJs6ppw15byN2",
    firstName: "arthur",
    email: "arthur.barreau44300@gmail.com",
    nickName: "arthur",
    lastName: "barreau",
  },
  {
    uid: "J2I5fRlastNamefdqvJ0Kybc4Ps4IPSr1",
    firstName: "thomas",
    email: "thomaslegagneux@hotmail.fr",
    nickName: "gagneux",
    lastName: "legagneux",
  },
  {
    uid: "gF6SAZmnKxe75sYtWuRz1uGBiFp2",
    firstName: "rayan",
    email: "aitrayan44@gmail.com",
    nickName: "rayan",
    lastName: "aitouarabi",
  },
  {
    uid: "I6WgOBkeJBb6E0n3hnqhzdi9MSh2",
    firstName: "florent",
    email: "florent.boulifard@outlook.fr",
    nickName: "boulif",
    lastName: "boulifard",
  },
  {
    uid: "QrikB2bD7ZNQS6rqlvpTXR1rsAz2",
    firstName: "antoine",
    email: "antoine.lepape29@gmail.com",
    nickName: "antoine",
    lastName: "le pape",
  },
  {
    uid: "qISge3VUD7dxpKdgsLJDnD9fMSi2",
    firstName: "valentin",
    email: "valentin.gaschard@hotmail.fr",
    nickName: "valgash",
    lastName: "gaschard",
  },
  {
    uid: "n4JsbShjHScgizPyUf0BBLFlgz72",
    firstName: "yohan",
    email: "yohan.nouet@gmail.com",
    nickName: "yo",
    lastName: "Nouet",
  },
  {
    uid: "x7cFO4biRmfuaCzA5z3zEtYCRwb2",
    firstName: "corentin",
    email: "corentin.bezin@gmail.com",
    nickName: "coco",
    lastName: "bezin",
  },
  {
    uid: "ESESf5Aq3madkW7yD9n2dZ7lBXH3",
    firstName: "romain",
    email: "romainlepotier3@gmail.com",
    nickName: "romain",
    lastName: "le potier",
  },
  {
    uid: "0lUs80DSbvVpfRONcTw76OUocMp2",
    firstName: "brok",
    email: "mathieu56100@hotmail.com",
    nickName: "brok",
    lastName: "m. brok",
  },
  {
    uid: "fkHinu5oagRwOBLXbujY6c0BJUn2",
    firstName: "nicolas",
    email: "daniaud.nicolas@gmail.com",
    nickName: "nico",
    lastName: "daniaud",
  },
];

async function importPlayers() {
  const batch = db.batch();

  for (const player of players) {
    const playerRef = db
      .collection("seasons")
      .doc("2026")
      .collection("players")
      .doc(player.uid);

    batch.set(playerRef, {
      uid: player.uid,
      firstName: player.firstName,
      lastName: player.lastName,
      nickName: player.nickName,
      email: player.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  console.log(`✅ ${players.length} joueurs importés dans seasons/2026/players`);
}

importPlayers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Erreur :", error);
    process.exit(1);
  });