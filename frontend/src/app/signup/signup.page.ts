import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { firstValueFrom } from 'rxjs';

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
  showPassword = false;
  showConfirmPassword = false;
  loading = false;
  error = '';

  get isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  get hasMinimumPasswordLength(): boolean {
    return this.password.length >= 10;
  }

  get hasPasswordUppercase(): boolean {
    return /[A-Z]/.test(this.password);
  }

  get hasPasswordLowercase(): boolean {
    return /[a-z]/.test(this.password);
  }

  get hasPasswordNumber(): boolean {
    return /[0-9]/.test(this.password);
  }

  get hasPasswordSpecialCharacter(): boolean {
    return /[^A-Za-z0-9]/.test(this.password);
  }

  get isPasswordValid(): boolean {
    return this.hasMinimumPasswordLength
      && this.hasPasswordUppercase
      && this.hasPasswordLowercase
      && this.hasPasswordNumber
      && this.hasPasswordSpecialCharacter;
  }

  get canCreateAccount(): boolean {
    return this.isEmailValid
      && this.isPasswordValid
      && this.password === this.confirmPassword;
  }

  constructor(private auth: AuthService, private router: Router, private api: ApiService) {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/saisons']);
    }
  }

  async createAccount() {
    if (!this.canCreateAccount) {
      return;
    }

    let accountCreated = false;
    try {
      this.loading = true;
      this.error = '';
      await this.auth.createAccount(this.email.trim(), this.password);
      accountCreated = true;
      await firstValueFrom(this.api.sendVerificationEmail());
      alert("Votre compte a été créé. Vérifiez votre boîte mail pour activer votre compte.")
      await this.router.navigate(['/login']);
    } catch (err: unknown) {
      const authError = err as { code?: string };
      this.error = accountCreated
        ? 'Votre compte a été créé, mais l’email de vérification n’a pas pu être envoyé. Connectez-vous pour demander un nouvel envoi.'
        : authError.code === 'auth/email-already-in-use'
        ? 'Cette adresse email possède déjà un compte. Connectez-vous ou utilisez une autre adresse.'
        : 'Impossible de créer le compte. Vérifiez votre email et votre mot de passe.';
    } finally {
      this.loading = false;
    }
  }
}
