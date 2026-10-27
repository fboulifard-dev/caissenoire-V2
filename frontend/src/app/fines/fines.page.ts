import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { catchError, forkJoin, of, Subscription } from 'rxjs';
import { ApiService } from '../services/api.service';

interface FineGroup {
  date: string;
  label: string;
  total: number;
  count?: number;
  items: any[];
}

@Component({
  selector: 'app-fines',
  templateUrl: './fines.page.html',
  styleUrls: ['./fines.page.scss'],
  standalone: false,
})
export class FinesPage implements OnInit, OnDestroy {
  fines: any[] = [];
  private allFineGroups: FineGroup[] = [];
  private visibleCount = 30;
  visibleFineGroups: FineGroup[] = [];
  hasMore = false;

  get fineGroups(): FineGroup[] {
    return this.allFineGroups;
  }

  set fineGroups(groups: FineGroup[]) {
    this.allFineGroups = groups;
    this.refreshVisible();
  }

  onInfinite(event: Event) {
    this.visibleCount += 30;
    this.refreshVisible();
    (event.target as HTMLIonInfiniteScrollElement).complete();
  }

  private refreshVisible() {
    let remaining = this.visibleCount;
    this.visibleFineGroups = [];
    for (const group of this.allFineGroups) {
      if (remaining <= 0) break;
      this.visibleFineGroups.push({ ...group, count: group.items.length, items: group.items.slice(0, remaining) });
      remaining -= group.items.length;
    }
    this.hasMore = this.allFineGroups.reduce((total, group) => total + group.items.length, 0) > this.visibleCount;
  }
  loading = true;
  seasonId = '';
  playerId = '';
  playerName = '';
  seasonYear = '';
  isAdmin = false;
  rules: any[] = [];
  selectedRuleId = '';
  ruleIcons: Record<string, string> = {};
  selectedFinePhoto = '';
  isFinePhotoOpen = false;
  private isActive = false;
  private querySubscription?: Subscription;
  private dataSubscription?: Subscription;

  get totalFineAmount(): number {
    return this.filteredFines.reduce((total, fine) => total + this.parseAmount(fine.amount), 0);
  }

  get filteredFines(): any[] {
    return this.selectedRuleId
      ? this.fines.filter(fine => String(fine.ruleId || fine.ruleLabel || 'unknown') === this.selectedRuleId)
      : this.fines;
  }

  get selectedRuleLabel(): string {
    return this.rules.find(rule => rule.id === this.selectedRuleId)?.label
      || this.fines.find(fine => String(fine.ruleId || fine.ruleLabel || 'unknown') === this.selectedRuleId)?.ruleLabel
      || (this.selectedRuleId === 'unknown' ? 'Règle inconnue' : 'Règle sélectionnée');
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
    this.selectedRuleId = this.route.snapshot.queryParamMap.get('regle') || '';
    this.querySubscription = this.route.queryParamMap.subscribe(params => {
      const playerId = params.get('joueur') || '';
      const selectedRuleId = params.get('regle') || '';
      if (playerId === this.playerId && selectedRuleId === this.selectedRuleId) return;

      this.playerId = playerId;
      this.selectedRuleId = selectedRuleId;
      if (this.isActive) this.loadFines();
    });
  }

  ionViewWillEnter() {
    this.isActive = true;
    this.ensureSeasonUrl();
    this.playerId = this.route.snapshot.queryParamMap.get('joueur') || '';
    this.selectedRuleId = this.route.snapshot.queryParamMap.get('regle') || '';
    this.loadFines();
  }

  ionViewWillLeave() {
    this.isActive = false;
  }

  ngOnDestroy() {
    this.querySubscription?.unsubscribe();
    this.dataSubscription?.unsubscribe();
  }

  private loadFines() {
    this.loading = true;
    this.dataSubscription?.unsubscribe();
    this.dataSubscription = forkJoin({
      fines: this.api.getSeasonFines(this.seasonId, this.playerId || undefined),
      rules: this.api.getSeasonRules(this.seasonId).pipe(catchError(() => of([]))),
      players: this.playerId ? this.api.getSeasonPlayers(this.seasonId).pipe(catchError(() => of([]))) : of([]),
      season: this.api.getSeason(this.seasonId).pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ fines, rules, players, season }: any) => {
        this.isAdmin = Array.isArray(season?.player?.roles)
          && season.player.roles.includes('ADMIN')
          && season.readOnly !== true;
        this.rules = rules || [];
        this.ruleIcons = {};
        this.rules.forEach((rule: any) => {
          if (rule.id && typeof rule.icon === 'string') {
            this.ruleIcons[rule.id] = rule.icon;
          }
        });
        const player = (players || []).find((item: any) => item.id === this.playerId);
        this.playerName = player
          ? `${player.firstName || ''} ${player.lastName || ''}`.trim() || player.name || player.email || ''
          : '';
        this.fines = fines || [];
        this.visibleCount = 30;
        this.fineGroups = this.groupByCreationDate(this.filteredFines);
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  getRuleIcon(ruleId: string | undefined): string {
    return ruleId ? this.ruleIcons[ruleId] || 'help-circle-outline' : 'help-circle-outline';
  }

  onRuleFilterChanged() {
    this.visibleCount = 30;
    this.fineGroups = this.groupByCreationDate(this.filteredFines);
  }

  clearFilter(filter: 'joueur' | 'regle') {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [filter]: null },
      queryParamsHandling: 'merge'
    });
  }

  openFinePhoto(photo: string) {
    this.selectedFinePhoto = photo;
    this.isFinePhotoOpen = true;
  }

  closeFinePhoto() {
    this.isFinePhotoOpen = false;
    this.selectedFinePhoto = '';
  }

  private ensureSeasonUrl() {
    const seasonId = this.route.snapshot.paramMap.get('seasonId') || this.route.parent?.snapshot.paramMap.get('seasonId');
    if (seasonId) {
      this.seasonId = seasonId;
      return;
    }
  }

  editFine(fine: any) {
    this.router.navigate(['/saisons', this.seasonId, 'operation', 'amendes', 'edit', fine.id]);
  }

  async deleteFine(fine: any) {
    const alert = await this.alertController.create({
      header: 'Supprimer l’amende ?',
      message: 'Cette action est irréversible.',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: () => {
            this.api.deleteFine(this.seasonId, fine.id).subscribe({
              next: () => {
                this.fines = this.fines.filter(item => item.id !== fine.id);
                this.fineGroups = this.groupByCreationDate(this.filteredFines);
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  private groupByCreationDate(items: any[]): { date: string; label: string; total: number; items: any[] }[] {
    const groups = new Map<string, any[]>();

    items.forEach(item => {
      const date = this.creationDateKey(item.date);
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

  formatGroupTotal(total: number): string {
    return this.formatCurrency(total);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  playerDisplayName(fine: any): string {
    return fine.playerName
      || `${fine.playerFirstName || ''} ${fine.playerLastName || ''}`.trim()
      || fine.name
      || fine.email
      || fine.playerId
      || 'Joueur inconnu';
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
