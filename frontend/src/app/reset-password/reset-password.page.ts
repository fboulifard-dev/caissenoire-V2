import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { passwordRequirements } from '../services/password-policy';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  standalone: false
})
export class ResetPasswordPage {
  private code = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  loading = false;
  linkValid = false;
  linkInvalid = false;
  completed = false;
  error = '';

  constructor(
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) {}

  get canSubmit(): boolean {
    return this.linkValid && Object.values(passwordRequirements(this.password)).every(Boolean)
      && this.password === this.confirmPassword;
  }

  async ionViewWillEnter() {
    const params = this.route.snapshot.queryParamMap;
    this.code = params.get('mode') === 'resetPassword' ? params.get('oobCode') || '' : '';
    this.location.replaceState('/reset-password');
    this.password = '';
    this.confirmPassword = '';
    this.completed = false;
    this.linkValid = false;
    this.linkInvalid = !this.code;
    this.error = this.linkInvalid ? 'Ce lien est invalide ou a expiré. Demandez un nouveau lien.' : '';
    if (this.code) await this.checkLink();
  }

  async checkLink() {
    if (this.loading || !this.code) return;
    this.loading = true;
    this.error = '';
    try {
      await this.auth.verifyPasswordResetCode(this.code);
      this.linkValid = true;
      this.linkInvalid = false;
    } catch (error: unknown) {
      this.handleError(error);
    } finally {
      this.loading = false;
    }
  }

  async submit() {
    if (this.loading || !this.canSubmit) return;
    this.loading = true;
    this.error = '';
    try {
      await this.auth.confirmPasswordReset(this.code, this.password);
    } catch (error: unknown) {
      this.handleError(error);
      this.loading = false;
      return;
    }
    this.code = '';
    this.password = '';
    this.confirmPassword = '';
    this.linkValid = false;
    this.completed = true;
    try {
      const navigated = await this.router.navigate(['/login'], { queryParams: { passwordReset: 'success' }, replaceUrl: true });
      if (!navigated) {
        this.error = 'Votre mot de passe a été modifié. Utilisez le lien de retour pour vous connecter.';
      }
    } catch {
      this.error = 'Votre mot de passe a été modifié. Utilisez le lien de retour pour vous connecter.';
    } finally {
      this.loading = false;
    }
  }

  private handleError(error: unknown) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : '';
    if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code' || code === 'auth/user-disabled' || code === 'auth/user-not-found') {
      this.linkValid = false;
      this.linkInvalid = true;
      this.error = 'Ce lien est invalide ou a expiré. Demandez un nouveau lien.';
    } else if (code === 'auth/weak-password' || code === 'auth/password-does-not-meet-requirements') {
      this.error = 'Ce mot de passe ne respecte pas les règles de sécurité. Essayez un autre mot de passe.';
    } else {
      this.error = 'Une erreur est survenue. Vérifiez votre connexion et réessayez.';
    }
  }
}
