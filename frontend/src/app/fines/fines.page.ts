import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-fines',
  templateUrl: './fines.page.html',
  styleUrls: ['./fines.page.scss'],
  standalone: false,
})
export class FinesPage implements OnInit {
  fines: any[] = [];
  fineGroups: { date: string; label: string; total: number; items: any[] }[] = [];
  loading = true;
  seasonId = '';
  playerId = '';
  playerName = '';
  seasonYear = '';
  readOnly = false;

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
    this.api.getSeasonFines(this.seasonId, this.playerId || undefined).subscribe((data: any) => {
      this.fines = data || [];
      this.fineGroups = this.groupByCreationDate(this.fines);
      this.loading = false;
    }, () => (this.loading = false));
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
                this.fineGroups = this.groupByCreationDate(this.fines);
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
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(total);
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
