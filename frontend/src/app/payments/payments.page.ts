import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { catchError, forkJoin, of, Subscription } from 'rxjs';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-payments',
  templateUrl: './payments.page.html',
  styleUrls: ['./payments.page.scss'],
  standalone: false,
})
export class PaymentsPage implements OnInit, OnDestroy {
  payments: any[] = [];
  paymentGroups: { date: string; label: string; total: number; items: any[] }[] = [];
  creators: any[] = [];
  selectedCreator = '';
  loading = true;
  seasonId = '';
  playerId = '';
  playerName = '';
  isAdmin = false;
  seasonYear = '';
  private isActive = false;
  private querySubscription?: Subscription;
  private dataSubscription?: Subscription;

  get totalPaymentAmount(): number {
    return this.payments.reduce((total, payment) => total + this.parseAmount(payment.amount), 0);
  }

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.ensureSeasonUrl();
    this.playerId = this.route.snapshot.queryParamMap.get('joueur') || '';
    this.querySubscription = this.route.queryParamMap.subscribe(params => {
      const playerId = params.get('joueur') || '';
      if (playerId === this.playerId) return;

      this.playerId = playerId;
      if (this.isActive) this.loadPayments();
    });
  }

  ionViewWillEnter() {
    this.isActive = true;
    this.ensureSeasonUrl();
    this.playerId = this.route.snapshot.queryParamMap.get('joueur') || '';
    this.loadPayments();
  }

  ionViewWillLeave() {
    this.isActive = false;
  }

  ngOnDestroy() {
    this.querySubscription?.unsubscribe();
    this.dataSubscription?.unsubscribe();
  }

  private loadPayments() {
    this.loading = true;
    this.dataSubscription?.unsubscribe();
    this.dataSubscription = forkJoin({
      payments: this.api.getSeasonPayments(this.seasonId, this.playerId || undefined),
      players: this.playerId ? this.api.getSeasonPlayers(this.seasonId).pipe(catchError(() => of([]))) : of([]),
      season: this.api.getSeason(this.seasonId).pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ payments, players, season }: any) => {
        this.isAdmin = Array.isArray(season?.player?.roles)
          && season.player.roles.includes('ADMIN')
          && season.readOnly !== true;
        const player = (players || []).find((item: any) => item.id === this.playerId);
        this.playerName = player
          ? `${player.firstName || ''} ${player.lastName || ''}`.trim() || player.name || player.email || ''
          : '';
        this.payments = payments || [];
        this.paymentGroups = this.groupByCreationDate(this.payments);
        this.creators = this.payments.filter((payment, index, paymentList) =>
          paymentList.findIndex(item => item.createdBy === payment.createdBy) === index
        );
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  editPayment(payment: any) {
    this.router.navigate(['/saisons', this.seasonId, 'operation', 'paiements', 'edit', payment.id]);
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
                this.paymentGroups = this.groupByCreationDate(this.payments);
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

  private groupByCreationDate(items: any[]): { date: string; label: string; total: number; items: any[] }[] {
    const groups = new Map<string, any[]>();

    items.forEach(item => {
      const date = this.creationDateKey(item.date || item.createdAt);
      const group = groups.get(date) || [];
      group.push(item);
      groups.set(date, group);
    });

    return Array.from(groups.entries())
      .sort(([first], [second]) => second.localeCompare(first))
      .map(([date, groupedItems]) => ({
        date,
        label: this.creationDateLabel(date),
        total: groupedItems.reduce((sum, item) => sum + this.parseAmount(item.amount), 0),
        items: groupedItems
      }));
  }

  formatGroupTotal(total: number): string {
    return this.formatCurrency(total);
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  playerDisplayName(payment: any): string {
    return payment.playerName
      || `${payment.playerFirstName || ''} ${payment.playerLastName || ''}`.trim()
      || payment.playerId
      || 'Joueur inconnu';
  }

  private parseAmount(amount: unknown): number {
    if (typeof amount === 'number') {
      return amount;
    }

    if (typeof amount !== 'string') {
      return 0;
    }

    const normalizedAmount = amount
      .replace(/\s/g, '')
      .replace(',', '.')
      .replace(/[^\d.-]/g, '');
    const parsedAmount = Number.parseFloat(normalizedAmount);
    return Number.isFinite(parsedAmount) ? parsedAmount : 0;
  }

  private creationDateKey(value: unknown): string {
    const parsedDate = value ? new Date(String(value)) : null;
    return parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toISOString().slice(0, 10)
      : 'unknown';
  }

  private creationDateLabel(date: string): string {
    if (date === 'unknown') {
      return 'Date inconnue';
    }

    const [year, month, day] = date.split('-').map(Number);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(year, month - 1, day));
  }

}
