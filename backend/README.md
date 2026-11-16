# Backend (Node.js + Express)

Prerequis:
- Node.js

Installation:

1. Copier `.env.example` en `.env` pour le développement local, puis adapter
   les variables Firebase et SMTP.
2. Installer les dépendances et démarrer :

```powershell
cd C:\caissenoire\backend
npm install
npm start
```

API:
### Vérification des comptes

L'inscription envoie un email de vérification via IONOS.
Configurer `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
`SMTP_PASSWORD` et `SMTP_FROM` dans `.env`. Pour IONOS France,
utiliser `smtp.ionos.fr`, le port `465` et `SMTP_SECURE=true` ; le port `587`
utilise `SMTP_SECURE=false` avec STARTTLS obligatoire. L'identifiant est
l'adresse complète de la boîte IONOS, et l'expéditeur doit être autorisé par
IONOS. Voir les [paramètres IONOS](https://www.ionos.fr/assistance/email/sujets-generaux/messagerie-ionos-donnees-de-serveur-pour-imap-pop3-et-smtp/).
En App Hosting, `apphosting.yaml` configure le serveur IONOS et référence les
secrets `SMTP_USER` et `SMTP_PASSWORD`. Chaque fichier d'environnement référence
son secret `SMTP_FROM`. Créer ces secrets dans
chacun des projets Firebase avant de déployer, avec l'adresse complète de la
boîte pour `SMTP_USER`, son mot de passe pour `SMTP_PASSWORD` et une adresse
d'expéditeur autorisée par IONOS pour `SMTP_FROM`. Ne pas versionner leurs
valeurs. Les valeurs définies dans la console App Hosting peuvent remplacer
celles du YAML.

Par exemple, pour chaque secret et chaque projet :

```sh
firebase apphosting:secrets:set SMTP_USER --project caissenoire-dev-84854
firebase apphosting:secrets:set SMTP_PASSWORD --project caissenoire-dev-84854
firebase apphosting:secrets:set SMTP_FROM --project caissenoire-dev-84854
firebase apphosting:secrets:grantaccess SMTP_USER,SMTP_PASSWORD,SMTP_FROM --backend api --project caissenoire-dev-84854
```

Répéter avec `--project asptt-nantes-hb` et `--backend backend-prod` pour la
production. La CLI demande les valeurs des secrets ; ne pas les passer en
arguments ni les partager.

Configurer `EMAIL_VERIFICATION_URL` avec l'URL absolue de la page `/login` de
l'application : par exemple `http://localhost:4200/login` en local. Les URL
Firebase Hosting de recette et de production sont définies respectivement dans
`apphosting.recette.yaml` et `apphosting.production.yaml` ; adaptez-les si
vous utilisez d'autres domaines. Une valeur définie dans la console App Hosting
peut remplacer celle du YAML. L'URL doit être accessible depuis l'appareil
ouvrant l'email ; `localhost` désigne cet appareil.
Le backend et le frontend doivent utiliser le même projet Firebase. Le lien
contient un code à usage unique Firebase ; un lien expiré ou déjà utilisé
affiche une erreur sur la page de connexion. Si l'envoi échoue après création
du compte, l'utilisateur peut se connecter et demander un nouvel email.
Le lien ouvre la version web ; une ouverture directe dans l'application native
nécessite une configuration distincte des liens universels ou Android App Links.

L'API `POST /api/account/verification-email` exige un jeton Firebase et envoie
uniquement à l'adresse du compte authentifié non vérifié. Elle limite les
tentatives par compte à une par minute et par instance ; ajouter une limitation
distribuée au niveau de l'hébergement pour un déploiement public.

L'inscription vérifie d'abord l'adresse via `POST /api/account/availability`,
puis demande le prénom et le nom enregistrés dans le profil Firebase. L'email
de vérification affiche ce nom et le logo ; les anciens comptes sans nom
reçoivent une salutation générique. Cette API publique révèle si une adresse
possède un compte : elle limite les vérifications à 10 par minute et par adresse
IP observée par le serveur sur chaque instance. Derrière un proxy, plusieurs
utilisateurs peuvent partager cette adresse. Cette limite n'est pas distribuée ;
prévoir également une protection contre les abus au niveau de l'hébergement.

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
- Les amendes des saisons sont modifiées uniquement via l'API backend ; les
  favoris communs sont réservés aux administrateurs de la saison active.
  Le choix de favori à la création s'applique à toutes les amendes créées
  pour les joueurs sélectionnés ; il reste modifiable par amende.
  Déployez les règles `firebase.firestore.rules` sur chaque projet Firebase :
  sans ces règles, un accès Firestore direct plus permissif pourrait contourner
  cette restriction.

Depuis la racine du dépôt, après avoir sélectionné le bon projet Firebase :

```sh
firebase deploy --config firebase.firestore.json --only firestore:rules --project ID_DU_PROJET
```

Cette commande remplace les règles Firestore du projet ciblé ; vérifiez-les
avant de l'exécuter, notamment en production.

Firebase setup (quick start)
1. Create a Firebase project at https://console.firebase.google.com.
2. Enable Firestore (Native mode) and Authentication -> Sign-in method: enable `Email/Password`, `Google` and `Apple`.
3. Create a Web app in Firebase to obtain the client config (used by the frontend).
4. Create a service account for the backend: Project Settings -> Service accounts -> Generate new private key. Configure `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` in `.env`. The private key must use `\\n` for line breaks. The local JSON file remains supported through `FIREBASE_SERVICE_ACCOUNT`.
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

Deploiement sur Firebase App Hosting
------------------------------------

Le backend Express est déployé depuis les fichiers locaux avec Firebase CLI.
App Hosting utilise les identifiants du runtime Firebase Admin ; les fichiers
locaux d'environnement et les clés de service sont exclus du déploiement.

Prerequis:
- Projet Firebase sur le plan Blaze
- Firebase CLI installé et connecté (`firebase login`)
- Droits de déploiement sur les projets Firebase

Depuis le dossier `backend` :

```sh
npm run deploy-rec
npm run deploy-prod
```

La première commande cible le backend `api` du projet
`caissenoire-dev-84854` ; la seconde cible `backend-prod` du projet
`asptt-nantes-hb`. Le build est réalisé par App Hosting après l'envoi des
sources locales, y compris les modifications non commitées. Ces backends
étant aussi liés à GitHub, un déploiement ultérieur depuis GitHub peut remplacer
ces modifications locales. Vérifiez les fichiers et la configuration avant
chaque déploiement, en particulier en production.

Les secrets SMTP doivent être configurés séparément dans chaque backend App
Hosting ; le fichier `.env` local n'est pas déployé. Utiliser Secret Manager pour
les identifiants et mots de passe et les paramètres de chaque backend pour les
autres valeurs. `apphosting.yaml` contient les paramètres communs ;
`apphosting.recette.yaml` et `apphosting.production.yaml` définissent
`NODE_ENV` pour les environnements App Hosting `recette` et `production`.
Vérifier ces noms dans les paramètres des backends Firebase : App Hosting
fusionne le fichier correspondant avec la configuration commune.

Pour les appels depuis l'application Ionic, remplacer l'URL locale de l'API
par cette URL App Hosting et verifier que le jeton Firebase est envoye dans
`Authorization: Bearer <ID_TOKEN>`.


