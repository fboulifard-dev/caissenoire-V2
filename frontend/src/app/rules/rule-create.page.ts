import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-rule-create',
  templateUrl: './rule-create.page.html',
  standalone: false,
})
export class RuleCreatePage {
  rule = {
    label: '',
    cost: 0,
    icon: 'alert-circle-outline',
    matchDay: false,
    active: true
  };
  iconOptions = [
    { name: 'leaf-outline', label: 'Propreté' },
    { name: 'chatbubbles-outline', label: 'Contestation' },
    { name: 'time-outline', label: 'Retard' },
    { name: 'dice-outline', label: 'Jeu' },
    { name: 'stopwatch-outline', label: 'Chronomètre' },
    { name: 'tennisball-outline', label: 'Sport' },
    { name: 'shirt-outline', label: 'Équipement' },
    { name: 'walk-outline', label: 'Déplacement' },
    { name: 'calendar-number-outline', label: 'Calendrier' },
    { name: 'file-tray-stacked-outline', label: 'Oubli' },
    { name: 'cash-outline', label: 'Paiement' },
    { name: 'medal-outline', label: 'Performance' },
    { name: 'thermometer-outline', label: 'Température' },
    { name: 'alert-circle-outline', label: 'Autre' }
  ];
  seasonId = '';
  saving = false;
  error = '';
  isAdmin = false;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.seasonId = this.route.snapshot.paramMap.get('seasonId') || this.route.parent?.snapshot.paramMap.get('seasonId') || '';
    this.api.getSeason(this.seasonId).subscribe({
      next: (season: any) => {
        this.isAdmin = Array.isArray(season?.player?.roles)
          && season.player.roles.includes('ADMIN')
          && season.readOnly !== true;
      }
    });
  }

  submit() {
    if (this.saving || !this.isAdmin) {
      return;
    }

    if (!this.rule.label.trim()) {
      this.error = 'Saisissez un libellé.';
      return;
    }

    if (this.rule.cost < 0) {
      this.error = 'Le montant doit être positif.';
      return;
    }

    this.saving = true;
    this.error = '';
    this.api.createRule({
      label: this.rule.label.trim(),
      cost: Number(this.rule.cost),
      icon: this.rule.icon,
      matchDay: this.rule.matchDay,
      active: true
    }, this.seasonId).subscribe({
      next: () => this.router.navigate(['/saisons', this.seasonId, 'regles']),
      error: () => {
        this.error = 'Impossible de créer la règle. Réessayez.';
        this.saving = false;
      }
    });
  }
}
