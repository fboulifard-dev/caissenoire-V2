import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  email = '';
  password = '';
  loading = false;

  get canSignInEmail(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim()) && this.password.trim().length > 0;
  }

  constructor(private auth: AuthService, private router: Router) {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/saisons']);
    }
  }

  async signInEmail() {
    try {
      this.loading = true;
      const {user} = await this.auth.signInEmail(this.email, this.password);
      if(user.emailVerified) {
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
      this.router.navigate(['/saisons']);
    } catch (err) {
      alert('Apple login failed');
    } finally {
      this.loading = false;
    }
  }
}
