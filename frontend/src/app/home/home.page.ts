import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  userName = 'Utilisateur';
  firstName = 'Utilisateur';
  lastName = '';
  paymentCount = 0;
  paymentTotal = 0;
  amountDue = 0;
  fineCount = 0;
  fineTotal = 0;
  playerPaymentCount = 0;
  playerPaymentTotal = 0;
  playerAmountDue = 0;
  playerFineCount = 0;
  playerFineTotal = 0;
  playerRank: number | null = null;
  rankingSize = 0;
  rulesCount = 0;
  playersCount = 0;
  summaryLoading = true;
  seasonId = '';
  seasonYear = '';
  connectedPlayerId = '';
  selectedPlayerId = '';
  players: any[] = [];

  constructor(
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
  ) {}

  ngOnInit() {
    this.ensureSeasonUrl();

    const user = this.auth.getCurrentUser();
    this.connectedPlayerId = user?.uid || '';
    this.selectedPlayerId = this.connectedPlayerId;
    const displayName = user?.displayName?.trim();

    if (displayName) {
      const parts = displayName.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        this.firstName = parts[0];
        this.lastName = parts.slice(1).join(' ');
        this.userName = this.firstName + ' ' + this.lastName;
      } else {
        this.firstName = displayName;
        this.lastName = '';
        this.userName = displayName;
      }
      return;
    }

    const email = user?.email?.trim();
    if (email) {
      const localPart = email.split('@')[0];
      this.firstName = localPart;
      this.lastName = '';
      this.userName = localPart;
    }
  }

  ionViewWillEnter() {
    this.summaryLoading = true;
    this.loadSeason();
  }

  private ensureSeasonUrl() {
    const seasonId = this.route.snapshot.paramMap.get('seasonId') || this.route.parent?.snapshot.paramMap.get('seasonId');
    if (seasonId) {
      this.seasonId = seasonId;
      return;
    }

    this.api.getActiveSeason().subscribe({
      next: (season: any) => {
        if (season?.id) {
          this.seasonId = season.id;
          this.router.navigate(['/home', season.id], { replaceUrl: true });
        }
      }
    });
  }

  private loadSeason() {
    const seasonId = this.route.snapshot.paramMap.get('seasonId') || this.route.parent?.snapshot.paramMap.get('seasonId');
    if (!seasonId) return;
    this.api.getSeason(seasonId).subscribe({
      next: (season: any) => {
        this.seasonYear = season.name || season.id;
        this.firstName = season.player?.firstName || this.firstName;
        this.lastName = season.player?.lastName || this.lastName;
        this.userName = `${this.firstName} ${this.lastName}`.trim();
        this.loadPlayers(season.id);
        this.loadPaymentSummary(season.id);
      },
      error: () => {
        this.loadPlayers(seasonId);
        this.loadPaymentSummary(seasonId);
      }
    });
  }

  private loadPlayers(seasonId: string) {
    this.api.getSeasonPlayers(seasonId).subscribe({
      next: (players: any) => this.players = players || [],
      error: () => this.players = []
    });
  }

  private loadPaymentSummary(seasonId: string) {
    this.api.getSeasonSummary(seasonId, this.selectedPlayerId).subscribe({
      next: (summary: any) => {
        const global = summary?.global || summary;
        const selected = summary?.selected || summary;
        this.paymentCount = global.paymentsCount || 0;
        this.paymentTotal = global.paymentsTotal || 0;
        this.fineCount = global.finesCount || 0;
        this.fineTotal = global.finesTotal || 0;
        this.amountDue = global.amountDue || 0;
        this.playerPaymentCount = selected.paymentsCount || 0;
        this.playerPaymentTotal = selected.paymentsTotal || 0;
        this.playerFineCount = selected.finesCount || 0;
        this.playerFineTotal = selected.finesTotal || 0;
        this.playerAmountDue = selected.amountDue || 0;
        this.playerRank = summary?.selectedRank ?? null;
        this.rankingSize = summary?.rankingSize || 0;
        this.rulesCount = summary?.rulesCount || 0;
        this.playersCount = summary?.playersCount || 0;
        this.summaryLoading = false;

      },
      error: () => (this.summaryLoading = false)
    });
  }

  onPlayerChanged() {
    if (this.seasonId) {
      this.summaryLoading = true;
      this.loadPaymentSummary(this.seasonId);
    }
  }

  playerName(playerId: string): string {
    const player = this.players.find(item => item.id === playerId);
    return player?.firstName || player?.lastName
      ? `${player.firstName || ''} ${player.lastName || ''}`.trim()
      : player?.name || player?.email || playerId;
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

  formatPaymentTotal(): string {
    return this.formatCurrency(this.paymentTotal);
  }

  formatAmountDue(): string {
    return this.formatCurrency(this.amountDue);
  }

  formatFineTotal(): string {
    return this.formatCurrency(this.fineTotal);
  }

  formatPlayerPaymentTotal(): string {
    return this.formatCurrency(this.playerPaymentTotal);
  }

  formatPlayerAmountDue(): string {
    return this.formatCurrency(this.playerAmountDue);
  }

  formatPlayerFineTotal(): string {
    return this.formatCurrency(this.playerFineTotal);
  }

  formatPlayerRank(): string {
    if (!this.playerRank) {
      return '-';
    }

    return this.playerRank === 1 ? '1er' : `${this.playerRank}e`;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  async logout() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}
