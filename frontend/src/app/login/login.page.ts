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
  verificationMessage = '';
  verificationError = '';
  unverifiedAccount = false;

  get isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  get canSignInEmail(): boolean {
    return this.isEmailValid && this.password.trim().length > 0;
  }

  constructor(
    private auth: AuthService,
    private router: Router,
    private api: ApiService,
    private pushNotifications: PushNotificationsService,
    private route: ActivatedRoute
  ) {
    if (!this.route.snapshot.queryParamMap.has('oobCode') && !this.route.snapshot.queryParamMap.has('mode')
      && !this.route.snapshot.queryParamMap.has('passwordReset') && this.auth.isLoggedIn()) {
      this.router.navigateByUrl('/', { replaceUrl: true });
    }
  }

  async ionViewWillEnter() {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('passwordReset') === 'success') {
      this.verificationError = '';
      this.verificationMessage = 'Votre mot de passe a été réinitialisé, merci de vous connecter.';
      await this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }
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
    if (this.loading || !this.canSignInEmail) {
      return;
    }

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
