import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-payment-create',
  templateUrl: './payment-create.page.html',
  styleUrls: ['./payment-create.page.scss'],
  standalone: false,
})
export class PaymentCreatePage {
  payment = {
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    playerId: '',
    comment: ''
  };
  users: any[] = [];
  saving = false;
  error = '';
  seasonId = '';
  paymentId = '';
  editing = false;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.ensureSeasonUrl();
    this.paymentId = this.route.snapshot.paramMap.get('paymentId') || '';
    this.editing = Boolean(this.paymentId);
    this.api.getUsers().subscribe({
      next: (users: any) => (this.users = users || []),
      error: () => (this.error = 'Impossible de charger les utilisateurs.')
    });
    if (this.editing) {
      this.loadPayment();
    }
  }

  private ensureSeasonUrl() {
    const seasonId = this.route.snapshot.paramMap.get('seasonId') || this.route.parent?.snapshot.paramMap.get('seasonId');
    if (seasonId) {
      this.seasonId = seasonId;
      return;
    }
  }

  private loadPayment() {
    this.api.getSeasonPayments(this.seasonId).subscribe({
      next: (payments: any) => {
        const existingPayment = (payments || []).find((item: any) => item.id === this.paymentId);
        if (!existingPayment) {
          this.error = 'Impossible de charger ce paiement.';
          return;
        }

        this.payment = {
          date: existingPayment.date || this.payment.date,
          amount: String(existingPayment.amount ?? ''),
          playerId: existingPayment.playerId || '',
          comment: existingPayment.comment || ''
        };
      },
      error: () => (this.error = 'Impossible de charger ce paiement.')
    });
  }

  submit() {
    if (this.saving) {
      return;
    }

    this.saving = true;
    this.error = '';
    const saveRequest = this.editing
      ? this.api.updatePayment(this.seasonId, this.paymentId, this.payment)
      : this.api.createPayment(this.seasonId, this.payment);
    saveRequest.subscribe({
      next: () => this.router.navigate(['/saisons', this.seasonId, 'paiements']),
      error: () => {
        this.error = `Impossible de ${this.editing ? 'modifier' : 'créer'} le paiement. Réessayez.`;
        this.saving = false;
      }
    });
  }

}
