# Backend (Node.js + Express)

Prerequis:
- Node.js

Installation:

1. Placer le fichier de compte de service Firebase dans `C:\caissenoire\backend\serviceAccountKey.json` ou indiquer le chemin via `FIREBASE_SERVICE_ACCOUNT`.
2. Copier `.env.example` en `.env` et adapter.
3. Installer les dépendances et démarrer:

```powershell
cd C:\caissenoire\backend
npm install
npm start
```

API:
API (protégées par Firebase ID tokens):
- `GET /api/fines` — liste des amendes (collection `fines` dans Firestore)
- `POST /api/fines` — créer une amende (body JSON)
- `PUT /api/fines/:id` — mettre à jour une amende
- `DELETE /api/fines/:id` — supprimer une amende
- `GET /api/payments` — liste des paiements (collection `payments` dans Firestore)
- `POST /api/payments` — créer un paiement (body JSON)
- `PUT /api/payments/:id` — mettre à jour un paiement
- `DELETE /api/payments/:id` — supprimer un paiement

Seeding sample data:

```powershell
cd C:\caissenoire\backend
npm install
npm run seed
```

Security:
- Exemple de règles Firestore: `firebase.firestore.rules` (autorise uniquement les utilisateurs authentifiés)

Firebase setup (quick start)
1. Create a Firebase project at https://console.firebase.google.com.
2. Enable Firestore (Native mode) and Authentication -> Sign-in method: enable `Email/Password`, `Google` and `Apple`.
3. Create a Web app in Firebase to obtain the client config (used by the frontend).
4. Create a service account for the backend: Project Settings -> Service accounts -> Generate new private key. Download the JSON file and place it at `backend/serviceAccountKey.json` or set the path in `.env` via `FIREBASE_SERVICE_ACCOUNT`.
5. (Optional) Deploy Firestore rules from this repo:

```powershell
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
```

6. Set `.env` and run the backend:

```powershell
cd C:\caissenoire\backend
copy .env.example .env
set FIREBASE_SERVICE_ACCOUNT=./serviceAccountKey.json
npm install
npm start
```

Seeding sample data:

```powershell
npm run seed
```

Security notes:
- Keep the `serviceAccountKey.json` private. Do not commit it to source control.
- Use Firebase IAM to scope service account permissions if needed.

Deploiement sur un NAS Synology (Container Manager)
----------------------------------------------------

Prerequis:
- Container Manager installe sur le NAS
- Git installe sur le NAS, ou copie du dossier `backend`
- Fichier `serviceAccountKey.json` Firebase copie sur le NAS dans le dossier `backend`

Depuis un terminal SSH du NAS, par exemple:

```sh
mkdir -p /volume1/docker/caissenoire
cd /volume1/docker/caissenoire
git clone https://github.com/fboulifard-dev/caissenoire-V2.git .
cd backend
# Copier ici serviceAccountKey.json avec SCP ou File Station
docker compose up -d --build
docker compose logs -f backend
```

L'API est alors disponible sur `http://ADRESSE_DU_NAS:3000`. Dans le pare-feu
Synology, autoriser le port TCP 3000 uniquement depuis les réseaux nécessaires.
Pour un accès Internet, utiliser de préférence un reverse proxy HTTPS Synology
et ne pas exposer directement le port 3000.

Commandes utiles:

```sh
docker compose ps
docker compose logs --tail=100 backend
docker compose restart backend
docker compose down
```


