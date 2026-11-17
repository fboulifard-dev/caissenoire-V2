import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: false
})
export class ForgotPasswordPage {
  email = '';
  loading = false;
  resetSent = false;
  resetError = '';

  constructor(private api: ApiService, private location: Location) {}

  get isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  ionViewWillEnter() {
    const state = this.location.getState();
    this.email = typeof state === 'object' && state !== null && 'email' in state && typeof state.email === 'string'
      ? state.email : '';
    this.resetSent = false;
    this.resetError = '';
  }

  async sendPasswordReset() {
    if (this.loading || !this.isEmailValid) return;

    try {
      this.loading = true;
      this.resetError = '';
      this.resetSent = false;
      await firstValueFrom(this.api.requestPasswordReset(this.email.trim()));
      this.resetSent = true;
    } catch (err: unknown) {
      this.resetError = err instanceof HttpErrorResponse && err.status === 429
        ? 'Trop de tentatives. Veuillez réessayer plus tard.'
        : 'Impossible d’envoyer le lien. Vérifiez l’adresse et réessayez.';
    } finally {
      this.loading = false;
    }
  }
}
