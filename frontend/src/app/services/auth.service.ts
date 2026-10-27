import { Injectable } from '@angular/core';
import { getAuth, Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, OAuthProvider, signOut, onAuthStateChanged, sendPasswordResetEmail, applyActionCode } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth: Auth;
  private currentUserSubject = new BehaviorSubject<any>(null);

  constructor() {
    initializeApp(environment.firebase);
    this.auth = getAuth();
    onAuthStateChanged(this.auth, (user) => {
      this.currentUserSubject.next(user);
    });
  }

  get currentUser$() {
    return this.currentUserSubject.asObservable();
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }

  isLoggedIn(): boolean {
    return !!this.auth.currentUser && this.auth.currentUser.emailVerified;
  }

  async authReady(): Promise<boolean> {
    try {
      await this.auth.authStateReady();
      return !!this.auth.currentUser && this.auth.currentUser.emailVerified;
    } catch {
      return false;
    }
  }

  async getAccessToken(forceRefresh = false): Promise<string | null> {
    const user = this.auth.currentUser;
    if (!user) {
      return null;
    }

    return user.getIdToken(forceRefresh);
  }

  signInEmail(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  requestPasswordReset(email: string) {
    return sendPasswordResetEmail(this.auth, email);
  }

  async createAccount(email: string, password: string) {
    const {user} = await createUserWithEmailAndPassword(this.auth, email, password);
    const response = await fetch(`${environment.apiUrl}/api/auth/send-verification`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await user.getIdToken()}` },
    });
    if (!response.ok) {
      throw new Error('verification-email-failed');
    }
  }

  // Valide le lien d'activation puis rafraîchit la session si l'utilisateur est déjà connecté
  async verifyEmail(oobCode: string): Promise<boolean> {
    await applyActionCode(this.auth, oobCode);
    await this.auth.authStateReady();
    const user = this.auth.currentUser;
    if (!user) {
      return false;
    }
    await user.reload();
    await user.getIdToken(true);
    this.currentUserSubject.next(user);
    return user.emailVerified;
  }

  signInGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(this.auth, provider);
  }

  signInAppleWeb() {
    const provider = new OAuthProvider('apple.com');
    return signInWithPopup(this.auth, provider);
  }

  signOut() {
    return signOut(this.auth);
  }
}
