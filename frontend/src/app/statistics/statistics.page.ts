import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../services/api.service';

interface RuleStatistics {
  id: string;
  label: string;
  count: number;
  amount: number;
}

interface PlayerStatistics {
  id: string;
  name: string;
  count: number;
  amount: number;
}

interface DailyFines {
  date: string;
  count: number;
  amount: number;
}

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.page.html',
  styleUrls: ['./statistics.page.scss'],
  standalone: false,
})
export class StatisticsPage {
  seasonId = '';
  seasonName = '';
  loading = true;
  error = '';
  metric: 'count' | 'amount' = 'amount';
  rankingMode: 'players' | 'rules' = 'players';
  fines: any[] = [];
  players: PlayerStatistics[] = [];
  rules: RuleStatistics[] = [];
  totalFineCount = 0;
  totalFineAmount = 0;
  chartPoints = '';
  chartAreaPoints = '';
  chartMaxLabel = '';
  chartStartLabel = '';
  chartMiddleLabel = '';
  chartEndLabel = '';

  constructor(
    private api: ApiService,
    private route: ActivatedRoute
  ) {}

  ionViewWillEnter() {
    this.seasonId = this.route.snapshot.paramMap.get('seasonId') || '';
    if (!this.seasonId) {
      this.error = 'La saison demandée est introuvable.';
      this.loading = false;
      return;
    }

    this.loadStatistics();
  }

  onMetricChanged(event: CustomEvent) {
    const value = (event.detail as { value?: string }).value;
    if (value === 'count' || value === 'amount') {
      this.metric = value;
      this.buildTrend();
    }
  }

  onRankingModeChanged(event: CustomEvent) {
    const value = (event.detail as { value?: string }).value;
    if (value === 'players' || value === 'rules') {
      this.rankingMode = value;
    }
  }

  ruleShare(rule: RuleStatistics): number {
    if (this.totalFineAmount > 0) {
      return rule.amount / this.totalFineAmount * 100;
    }
    return this.totalFineCount ? rule.count / this.totalFineCount * 100 : 0;
  }

  ruleBarWidth(rule: RuleStatistics): number {
    return Math.max(2, this.ruleShare(rule));
  }

  playerShare(player: PlayerStatistics): number {
    if (this.totalFineAmount > 0) {
      return Math.min(100, player.amount / this.totalFineAmount * 100);
    }
    return this.totalFineCount ? player.count / this.totalFineCount * 100 : 0;
  }

  playerBarWidth(player: PlayerStatistics): number {
    return Math.max(2, this.playerShare(player));
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
  }

  private loadStatistics() {
    this.loading = true;
    this.error = '';
    this.api.getSeasonFines(this.seasonId).subscribe({
      next: (fines: any) => {
        this.fines = Array.isArray(fines) ? fines : [];
        this.totalFineCount = this.fines.length;
        this.totalFineAmount = this.fines.reduce((total, fine) => total + this.parseAmount(fine.amount), 0);
        this.buildPlayerStatistics();
        this.buildRuleStatistics();
        this.buildTrend();
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger les statistiques de cette saison.';
        this.loading = false;
      }
    });
  }

  private buildPlayerStatistics() {
    const grouped = new Map<string, PlayerStatistics>();

    this.fines.forEach(fine => {
      const id = String(fine.playerId || fine.playerName || 'unknown');
      const name = fine.playerName
        || [fine.playerFirstName, fine.playerLastName].filter(Boolean).join(' ')
        || fine.playerId
        || 'Joueur inconnu';
      const existing = grouped.get(id) || { id, name, count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += this.parseAmount(fine.amount);
      grouped.set(id, existing);
    });

    this.players = Array.from(grouped.values()).sort((first, second) =>
      second.amount - first.amount || second.count - first.count || first.name.localeCompare(second.name, 'fr')
    );
  }

  private buildRuleStatistics() {
    const grouped = new Map<string, RuleStatistics>();

    this.fines.forEach(fine => {
      const id = String(fine.ruleId || fine.ruleLabel || 'unknown');
      const existing = grouped.get(id) || {
        id,
        label: fine.ruleLabel || 'Règle inconnue',
        count: 0,
        amount: 0
      };
      existing.count += 1;
      existing.amount += this.parseAmount(fine.amount);
      grouped.set(id, existing);
    });

    this.rules = Array.from(grouped.values()).sort((first, second) =>
      second.amount - first.amount || second.count - first.count || first.label.localeCompare(second.label, 'fr')
    );
  }

  private buildTrend() {
    const daily = new Map<string, DailyFines>();
    this.fines.forEach(fine => {
      const date = this.normalizeDate(fine.date || fine.createdAt);
      if (!date) return;

      const existing = daily.get(date) || { date, count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += this.parseAmount(fine.amount);
      daily.set(date, existing);
    });

    const days = Array.from(daily.values()).sort((first, second) => first.date.localeCompare(second.date));
    if (!days.length) {
      this.chartPoints = '';
      this.chartAreaPoints = '';
      this.chartMaxLabel = this.metric === 'amount' ? this.formatCurrency(0) : '0';
      this.chartStartLabel = '';
      this.chartMiddleLabel = '';
      this.chartEndLabel = '';
      return;
    }

    let cumulativeCount = 0;
    let cumulativeAmount = 0;
    const values = days.map(day => {
      cumulativeCount += day.count;
      cumulativeAmount += day.amount;
      return this.metric === 'count' ? cumulativeCount : cumulativeAmount;
    });
    const maximum = Math.max(...values);
    const scaleMaximum = maximum > 0 ? maximum * 1.12 : 1;
    this.chartMaxLabel = this.metric === 'amount' ? this.formatCurrency(maximum) : this.formatNumber(maximum);

    const firstTime = Date.parse(`${days[0].date}T00:00:00Z`);
    const lastTime = Date.parse(`${days[days.length - 1].date}T00:00:00Z`);
    const span = Math.max(86400000, lastTime - firstTime + 86400000);
    const coordinates = ['24,140'];
    days.forEach((day, index) => {
      const dayOffset = Date.parse(`${day.date}T00:00:00Z`) - firstTime + 86400000;
      const x = 24 + dayOffset / span * 312;
      const y = 140 - values[index] / scaleMaximum * 120;
      coordinates.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    });

    this.chartPoints = coordinates.join(' ');
    this.chartAreaPoints = `24,140 ${this.chartPoints} 336,140`;
    this.chartStartLabel = this.formatDate(days[0].date);
    this.chartMiddleLabel = this.formatDate(new Date((firstTime + lastTime) / 2).toISOString().slice(0, 10));
    this.chartEndLabel = this.formatDate(days[days.length - 1].date);
  }

  private normalizeDate(value: unknown): string | null {
    if (typeof value !== 'string' || !value) return null;
    const date = value.slice(0, 10);
    return Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ? null : date;
  }

  private formatDate(date: string): string {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
      .format(new Date(`${date}T00:00:00Z`));
  }

  private parseAmount(amount: unknown): number {
    if (typeof amount === 'number') return Number.isFinite(amount) ? amount : 0;
    if (typeof amount !== 'string') return 0;

    const normalized = amount.replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}