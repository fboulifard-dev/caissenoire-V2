import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { firstValueFrom } from 'rxjs';
import { User } from 'firebase/auth';
import { passwordRequirements } from '../services/password-policy';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: false,
})
export class SignupPage {
  email = '';
  password = '';
  confirmPassword = '';
  firstName = '';
  lastName = '';
  personalInfoStep = false;
  private createdUser: User | null = null;
  showPassword = false;
  showConfirmPassword = false;
  loading = false;
  error = '';

  get isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  get isPasswordValid(): boolean {
    return Object.values(passwordRequirements(this.password)).every(Boolean);
  }

  get canContinue(): boolean {
    return this.isEmailValid
      && this.isPasswordValid
      && this.password === this.confirmPassword;
  }

  get canCreateAccount(): boolean {
    return this.canContinue && !!this.firstName.trim() && !!this.lastName.trim();
  }

  get canGoBack(): boolean {
    return !this.createdUser;
  }

  constructor(private auth: AuthService, private router: Router, private api: ApiService) {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/saisons']);
    }
  }

  async checkAvailability() {
    if (this.loading || !this.canContinue) {
      return;
    }

    try {
      this.loading = true;
      this.error = '';
      const email = this.email.trim();
      const { available } = await firstValueFrom(this.api.checkAccountAvailability(email));
      if (email !== this.email.trim() || !this.canContinue) {
        this.error = 'Les informations ont changé. Vérifiez à nouveau votre adresse email.';
        return;
      }
      if (!available) {
        this.error = 'Cette adresse email possède déjà un compte. Connectez-vous ou utilisez une autre adresse.';
        return;
      }
      this.personalInfoStep = true;
    } catch {
      this.error = 'Impossible de vérifier cette adresse email. Veuillez réessayer plus tard.';
    } finally {
      this.loading = false;
    }
  }

  backToCredentials() {
    if (!this.createdUser) {
      this.personalInfoStep = false;
      this.error = '';
    }
  }

  async createAccount() {
    if (this.loading || !this.personalInfoStep || !this.canCreateAccount) {
      return;
    }

    try {
      this.loading = true;
      this.error = '';
      if (!this.createdUser) {
        const { user } = await this.auth.createAccount(this.email.trim(), this.password);
        this.createdUser = user;
      }
      await this.auth.updateAccountName(this.createdUser, `${this.firstName.trim()} ${this.lastName.trim()}`);
      await firstValueFrom(this.api.sendVerificationEmail());
      alert("Votre compte a été créé. Vérifiez votre boîte mail pour activer votre compte.")
      await this.router.navigate(['/login']);
    } catch (err: unknown) {
      const authError = err as { code?: string };
      if (this.createdUser) {
        this.error = 'Votre compte a été créé, mais sa finalisation ou l’envoi de l’email a échoué. Réessayez.';
      } else if (authError.code === 'auth/email-already-in-use') {
        this.personalInfoStep = false;
        this.error = 'Cette adresse email possède déjà un compte. Connectez-vous ou utilisez une autre adresse.';
      } else {
        this.error = 'Impossible de créer le compte. Vérifiez votre email et votre mot de passe.';
      }
    } finally {
      this.loading = false;
    }
  }
}
