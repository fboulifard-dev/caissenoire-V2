import { Injectable } from '@angular/core';
import { getAuth, Auth, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider, OAuthProvider, signOut, onAuthStateChanged, checkActionCode, applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
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

  verifyPasswordResetCode(code: string) {
    return verifyPasswordResetCode(this.auth, code);
  }

  confirmPasswordReset(code: string, password: string) {
    return confirmPasswordReset(this.auth, code, password);
  }

  createAccount(email: string, password: string) {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  updateAccountName(user: User, displayName: string) {
    return updateProfile(user, { displayName });
  }

  async verifyEmail(code: string) {
    await this.auth.authStateReady();
    const action = await checkActionCode(this.auth, code);
    if (action.operation !== 'VERIFY_EMAIL') {
      throw new Error('Invalid verification action');
    }
    if (this.auth.currentUser?.email === action.data.email) {
      await signOut(this.auth);
    }
    await applyActionCode(this.auth, code);
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
