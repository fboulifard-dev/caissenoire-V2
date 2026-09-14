import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-fine-create',
  templateUrl: './fine-create.page.html',
  styleUrls: ['./fine-create.page.scss'],
  standalone: false,
})
export class FineCreatePage {
  fine = {
    date: new Date().toISOString().slice(0, 10),
    playerId: '',
    ruleId: '',
    amount: 0,
    comment: '',
    photo: '',
    matchDay: false,
  };
  players: any[] = [];
  rules: any[] = [];
  saving = false;
  imageError = '';
  error = '';
  seasonId = '';
  fineId = '';
  editing = false;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.ensureSeasonUrl();
    this.fineId = this.route.snapshot.paramMap.get('fineId') || '';
    this.editing = Boolean(this.fineId);
    this.loadSelectableData();
    if (this.editing) {
      this.loadFine();
    }
  }

  private ensureSeasonUrl() {
    const seasonId = this.route.snapshot.paramMap.get('seasonId') || this.route.parent?.snapshot.paramMap.get('seasonId');
    if (seasonId) {
      this.seasonId = seasonId;
      return;
    }
  }

  private loadSelectableData() {
    this.api.getSeasonPlayers(this.seasonId).subscribe({
      next: (players: any) => (this.players = players || []),
      error: () => (this.error = 'Impossible de charger les joueurs.')
    });

    this.api.getSeasonRules(this.seasonId).subscribe({
      next: (rules: any) => {
        this.rules = (rules || []).filter((rule: any) => rule.active !== false);
      },
      error: () => (this.error = 'Impossible de charger les règles.')
    });
  }

  private loadFine() {
    this.api.getSeasonFines(this.seasonId).subscribe({
      next: (fines: any) => {
        const existingFine = (fines || []).find((fine: any) => fine.id === this.fineId);
        if (!existingFine) {
          this.error = 'Impossible de charger cette amende.';
          return;
        }

        this.fine = {
          date: existingFine.date || this.fine.date,
          playerId: existingFine.playerId || '',
          ruleId: existingFine.ruleId || '',
          amount: Number(existingFine.amount) || 0,
          comment: existingFine.comment || '',
          photo: existingFine.photo || '',
          matchDay: Boolean(existingFine.matchDay),
        };
      },
      error: () => (this.error = 'Impossible de charger cette amende.')
    });
  }

  private getSelectedRule() {
    return this.rules.find((rule: any) => rule.id === this.fine.ruleId) || null;
  }

  onRuleChanged() {
    const selectedRule = this.getSelectedRule();
    const baseCost = Number(selectedRule?.cost ?? 0) || 0;
    this.fine.amount = baseCost;
    this.fine.matchDay = Boolean(selectedRule?.matchDay);
  }

  onMatchDayChanged(event: CustomEvent) {
    const isMatchDay = Boolean(event?.detail?.checked ?? event?.detail?.value ?? this.fine.matchDay);
    if (!this.fine.ruleId) {
      this.fine.matchDay = isMatchDay;
      return;
    }

    const selectedRule = this.getSelectedRule();
    const baseCost = Number(selectedRule?.cost ?? 0) || 0;
    this.fine.matchDay = isMatchDay;
    this.fine.amount = isMatchDay ? baseCost * 2 : baseCost;
  }

  submit() {
    if (this.saving) {
      return;
    }

    if (!this.fine.playerId || !this.fine.ruleId) {
      this.error = 'Sélectionnez un joueur et une règle.';
      return;
    }

    if (!this.fine.amount && this.fine.amount !== 0) {
      this.error = 'Le montant de l’amende est invalide.';
      return;
    }

    this.saving = true;
    this.error = '';
    const fineData = {
      date: this.fine.date,
      playerId: this.fine.playerId,
      ruleId: this.fine.ruleId,
      amount: Number(this.fine.amount),
      comment: this.fine.comment,
      photo: this.fine.photo || undefined,
      matchDay: this.fine.matchDay,
    };
    const saveRequest = this.editing
      ? this.api.updateFine(this.seasonId, this.fineId, fineData)
      : this.api.createFine(this.seasonId, fineData);
    saveRequest.subscribe({
      next: () => this.router.navigate(['/saisons', this.seasonId, 'amendes']),
      error: () => {
        this.error = `Impossible de ${this.editing ? 'modifier' : 'créer'} l’amende. Réessayez.`;
        this.saving = false;
      }
    });
  }

  async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.imageError = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.imageError = 'Sélectionnez une image.';
      input.value = '';
      return;
    }

    try {
      this.fine.photo = await this.compressImage(file);
    } catch {
      this.imageError = 'Impossible de charger cette image.';
      input.value = '';
    }
  }

  private compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('Invalid image'));
        image.onload = () => {
          const maxDimension = 1200;
          const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext('2d');

          if (!context) {
            reject(new Error('Canvas unavailable'));
            return;
          }

          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        image.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }
}
