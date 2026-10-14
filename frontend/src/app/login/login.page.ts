import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../services/api.service';
import { PushNotificationsService } from '../services/push-notifications.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  email = '';
  password = '';
  showPassword = false;
  loading = false;
  resetMode = false;
  resetSent = false;
  resetError = '';

  get isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  get canSignInEmail(): boolean {
    return this.isEmailValid && this.password.trim().length > 0;
  }

  showPasswordReset() {
    this.resetMode = true;
    this.resetSent = false;
    this.resetError = '';
  }

  cancelPasswordReset() {
    this.resetMode = false;
    this.resetSent = false;
    this.resetError = '';
  }

  async sendPasswordReset() {
    if (!this.isEmailValid) {
      return;
    }

    try {
      this.loading = true;
      this.resetError = '';
      await this.auth.requestPasswordReset(this.email.trim());
      this.resetSent = true;
    } catch (err: unknown) {
      const authError = err as { code?: string };
      this.resetError = authError.code === 'auth/too-many-requests'
        ? 'Trop de tentatives. Veuillez réessayer plus tard.'
        : 'Impossible d’envoyer le lien. Vérifiez l’adresse et réessayez.';
    } finally {
      this.loading = false;
    }
  }

  constructor(
    private auth: AuthService,
    private router: Router,
    private api: ApiService,
    private pushNotifications: PushNotificationsService
  ) {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/saisons']);
    }
  }

  async signInEmail() {
    try {
      this.loading = true;
      const {user} = await this.auth.signInEmail(this.email, this.password);
      if(user.emailVerified) {
      await this.registerPushToken();
      this.router.navigate(['/saisons']);
      } else {
        alert("Votre email n'est pas vérifier. Veuillez vérifier votre boîte mail pour activer votre compte.")
      }
    } catch (err) {
      alert('Login failed');
    } finally {
      this.loading = false;
    }
  }

  async signInGoogle() {
    try {
      this.loading = true;
      await this.auth.signInGoogle();
      await this.registerPushToken();
      this.router.navigate(['/saisons']);
    } catch (err) {
      alert('Google login failed');
    } finally {
      this.loading = false;
    }
  }

  async signInApple() {
    try {
      this.loading = true;
      await this.auth.signInAppleWeb();
      await this.registerPushToken();
      this.router.navigate(['/saisons']);
    } catch (err) {
      alert('Apple login failed');
    } finally {
      this.loading = false;
    }
  }

  private async registerPushToken() {
    try {
      const token = await this.pushNotifications.requestPermissionAndGetToken();
      if (token) {
        await firstValueFrom(this.api.registerDeviceToken(token));
      }
    } catch {
      // Notification permission and registration must not block login.
    }
  }
}
