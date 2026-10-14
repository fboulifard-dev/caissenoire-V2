import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-fine-create',
  templateUrl: './fine-create.page.html',
  styleUrls: ['./fine-create.page.scss'],
  standalone: false,
})
export class FineCreatePage implements OnDestroy {
  private readonly maxPhotoSize = 5 * 1024 * 1024;
  private pendingPhoto: Blob | null = null;
  fine = {
    date: new Date().toISOString().slice(0, 10),
    playerId: '',
    playerIds: [] as string[],
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
  photoPreviewUrl = '';
  photoRemoved = false;
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

  ngOnDestroy() {
    if (this.photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.photoPreviewUrl);
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
          playerIds: existingFine.playerId ? [existingFine.playerId] : [],
          ruleId: existingFine.ruleId || '',
          amount: Number(existingFine.amount) || 0,
          comment: existingFine.comment || '',
          photo: existingFine.photo || '',
          matchDay: Boolean(existingFine.matchDay),
        };
        this.photoPreviewUrl = this.fine.photo;
        this.photoRemoved = false;
      },
      error: () => (this.error = 'Impossible de charger cette amende.')
    });
  }

  private getSelectedRule() {
    return this.rules.find((rule: any) => rule.id === this.fine.ruleId) || null;
  }

  get selectedRuleIcon(): string {
    return this.getSelectedRule()?.icon || 'alert-circle-outline';
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

  async submit() {
    if (this.saving) {
      return;
    }

    const playerIds = (this.editing ? [this.fine.playerId] : this.fine.playerIds)
      .filter((playerId): playerId is string => typeof playerId === 'string' && playerId.trim().length > 0);
    if (!playerIds.length || !this.fine.ruleId) {
      this.error = 'Sélectionnez au moins un joueur et une règle.';
      return;
    }

    if (!this.fine.amount && this.fine.amount !== 0) {
      this.error = 'Le montant de l’amende est invalide.';
      return;
    }

    this.saving = true;
    this.error = '';
    try {
      if (this.pendingPhoto) {
        const uploadedPhoto = await firstValueFrom(this.api.uploadFinePhoto(this.seasonId, this.pendingPhoto));
        this.fine.photo = uploadedPhoto.photo;
        if (this.photoPreviewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(this.photoPreviewUrl);
        }
        this.photoPreviewUrl = uploadedPhoto.photo;
        this.pendingPhoto = null;
      }

      const commonFineData = {
        date: this.fine.date,
        ruleId: this.fine.ruleId,
        amount: Number(this.fine.amount),
        comment: this.fine.comment,
        photo: this.photoRemoved ? null : this.fine.photo || undefined,
        matchDay: this.fine.matchDay,
      };
      const saveRequest = this.editing
        ? this.api.updateFine(this.seasonId, this.fineId, { ...commonFineData, playerId: this.fine.playerId })
        : this.api.createFine(this.seasonId, { ...commonFineData, playerIds });
      await firstValueFrom(saveRequest);
      await this.router.navigate(['/saisons', this.seasonId, 'operation', 'amendes']);
    } catch {
      this.error = `Impossible de ${this.editing ? 'modifier' : 'créer'} l’amende. Réessayez.`;
      this.saving = false;
    }
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

    if (file.size > this.maxPhotoSize) {
      this.imageError = 'La photo ne doit pas dépasser 5 Mo.';
      input.value = '';
      return;
    }

    try {
      const compressedPhoto = await this.compressImage(file);
      if (compressedPhoto.size > this.maxPhotoSize) {
        this.imageError = 'La photo compressée dépasse la limite de 5 Mo.';
        input.value = '';
        return;
      }
      if (this.photoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.photoPreviewUrl);
      }
      this.pendingPhoto = compressedPhoto;
      this.photoPreviewUrl = URL.createObjectURL(compressedPhoto);
      this.photoRemoved = false;
    } catch {
      this.imageError = 'Impossible de charger cette image.';
      input.value = '';
    }
  }

  removePhoto() {
    if (this.photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.photoPreviewUrl);
    }
    this.photoPreviewUrl = '';
    this.pendingPhoto = null;
    this.fine.photo = '';
    this.photoRemoved = true;
  }

  private compressImage(file: File): Promise<Blob> {
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
          canvas.toBlob(blob => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Image compression failed'));
            }
          }, 'image/jpeg', 0.8);
        };
        image.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }
}
