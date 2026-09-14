import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-payments',
  templateUrl: './payments.page.html',
  styleUrls: ['./payments.page.scss'],
  standalone: false,
})
export class PaymentsPage implements OnInit {
  payments: any[] = [];
  creators: any[] = [];
  selectedCreator = '';
  loading = true;
  seasonId = '';
  playerId = '';
  playerName = '';
  readOnly = false;
  seasonYear = '';

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.ensureSeasonUrl();
    this.playerId = this.route.snapshot.queryParamMap.get('joueur') || '';
  }

  ionViewWillEnter() {
    this.loading = true;
    this.api.getSeasonPayments(this.seasonId, this.playerId || undefined).subscribe((data: any) => {
      this.payments = data || [];
      this.creators = this.payments.filter((payment, index, payments) =>
        payments.findIndex(item => item.createdBy === payment.createdBy) === index
      );
      this.loading = false;
    }, () => (this.loading = false));
  }

  editPayment(payment: any) {
    this.router.navigate(['/saisons', this.seasonId, 'paiements', 'edit', payment.id]);
  }

  async deletePayment(payment: any) {
    const alert = await this.alertController.create({
      header: 'Supprimer le paiement ?',
      message: 'Cette action est irréversible.',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: () => {
            this.api.deletePayment(this.seasonId, payment.id).subscribe({
              next: () => {
                this.payments = this.payments.filter(item => item.id !== payment.id);
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  private ensureSeasonUrl() {
    const seasonId = this.route.snapshot.paramMap.get('seasonId') || this.route.parent?.snapshot.paramMap.get('seasonId');
    if (seasonId) {
      this.seasonId = seasonId;
      return;
    }
  }

}
