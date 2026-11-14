import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
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
  verificationMessage = '';
  verificationError = '';
  unverifiedAccount = false;

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
    private pushNotifications: PushNotificationsService,
    private route: ActivatedRoute
  ) {
    if (!this.route.snapshot.queryParamMap.has('oobCode') && !this.route.snapshot.queryParamMap.has('mode') && this.auth.isLoggedIn()) {
      this.router.navigateByUrl('/', { replaceUrl: true });
    }
  }

  async ionViewWillEnter() {
    const params = this.route.snapshot.queryParamMap;
    const code = params.get('oobCode');
    if (!code && !params.has('mode')) return;

    this.loading = true;
    this.verificationMessage = '';
    this.verificationError = '';
    await this.router.navigate(['/login'], { replaceUrl: true });
    try {
      if (params.get('mode') !== 'verifyEmail' || !code) {
        throw new Error('Invalid verification link');
      }
      await this.auth.verifyEmail(code);
      this.unverifiedAccount = false;
      this.verificationMessage = 'Votre compte a été validé, merci de vous connecter.';
    } catch {
      this.verificationError = 'Ce lien de validation est invalide ou a expiré. Connectez-vous pour demander un nouvel email.';
    } finally {
      this.loading = false;
    }
  }

  async resendVerificationEmail() {
    try {
      this.loading = true;
      this.verificationError = '';
      this.verificationMessage = '';
      await firstValueFrom(this.api.sendVerificationEmail());
      this.verificationMessage = 'Un email de vérification a été envoyé. Vérifiez votre boîte mail.';
    } catch {
      this.verificationError = 'Impossible d’envoyer l’email de vérification. Veuillez réessayer plus tard.';
    } finally {
      this.loading = false;
    }
  }

  async signInEmail() {
    try {
      this.loading = true;
      this.unverifiedAccount = false;
      const {user} = await this.auth.signInEmail(this.email, this.password);
      if(user.emailVerified) {
      await this.registerPushToken();
      this.router.navigateByUrl('/', { replaceUrl: true });
      } else {
        this.unverifiedAccount = true;
        this.verificationMessage = '';
        this.verificationError = 'Votre email n’est pas encore vérifié. Consultez votre boîte mail ou demandez un nouvel email.';
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
      this.router.navigateByUrl('/', { replaceUrl: true });
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
      this.router.navigateByUrl('/', { replaceUrl: true });
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
