# Frontend (Angular + Ionic)

Cette application Angular sera utilisée pour le Web et empaquetée avec Ionic/Capacitor pour Android et iOS.

Exemple de création d'un projet Angular + Ionic:

```powershell
npm install -g @angular/cli @ionic/cli
ionic start caisse-noire-frontend blank --type=angular
cd caisse-noire-frontend
npm install firebase @angular/fire
```

Configurer Firebase:
- Créer un projet Firebase et activer Firestore.
- Dans Authentication > Sign-in method, activer `Email/Password`, `Google` et `Apple`.
- Ajouter la configuration Firebase dans `src/environments/environment.ts`.

Configurer Firebase (frontend)

- Installer les packages:

```powershell
cd C:\caissenoire\frontend
npm install firebase @angular/fire
```

- Ajouter la configuration Firebase dans `src/environments/environment.ts` (exemple):

```ts
export const environment = {
	production: false,
	apiUrl: 'http://localhost:3000',
	firebase: {
		apiKey: 'YOUR_API_KEY',
		authDomain: 'YOUR_PROJECT.firebaseapp.com',
		projectId: 'YOUR_PROJECT',
		storageBucket: 'YOUR_PROJECT.appspot.com',
		messagingSenderId: 'SENDER_ID',
		appId: 'APP_ID'
	}
};
```

- Initialisation simplifiée (extrait `app.module.ts`):

```ts
import { NgModule } from '@angular/core';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { environment } from '../environments/environment';

@NgModule({
	imports: [
		provideFirebaseApp(() => initializeApp(environment.firebase)),
		provideAuth(() => getAuth()),
		provideFirestore(() => getFirestore())
	]
})
export class AppModule {}
```

- Exemple d'`AuthService` minimal (utilise Firebase Web SDK via `@angular/fire`):

```ts
import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
	constructor(private auth: Auth) {}

	signInEmail(email: string, password: string) {
		return signInWithEmailAndPassword(this.auth, email, password);
	}

	signInGoogle() {
		const provider = new GoogleAuthProvider();
		return signInWithPopup(this.auth, provider);
	}

	signInAppleWeb() {
		const provider = new OAuthProvider('apple.com');
		return signInWithPopup(this.auth, provider);
	}
}
```

Notes:
- For native Google/Apple on mobile, use Capacitor plugins (e.g. `@codetrix-studio/capacitor-google-auth`) or configure OAuth redirect flows and platform-specific keys.
- Apple Sign-in on iOS requires additional setup in Apple Developer portal and Firebase console (Service ID, key, return URLs).

Intégration mobile (Capacitor):

```powershell
ionic build
npx cap add android
npx cap add ios
npx cap copy
npx cap open android
npx cap open ios
```

Notes:
- Apple Sign-in nécessite une configuration supplémentaire dans la console Firebase et sur le portail Apple (Service ID, clé etc.).
- Utiliser `@angular/fire` pour Auth + Firestore; côté backend le serveur Node.js peut utiliser Firebase Admin si besoin pour opérations sécurisées.
