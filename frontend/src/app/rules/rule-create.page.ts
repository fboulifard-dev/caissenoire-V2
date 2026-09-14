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
    matchDay: false,
    active: true
  };
  seasonId = '';
  saving = false;
  error = '';

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.seasonId = this.route.snapshot.paramMap.get('seasonId') || this.route.parent?.snapshot.paramMap.get('seasonId') || '';
  }

  submit() {
    if (this.saving) {
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
      matchDay: this.rule.matchDay
    }, this.seasonId).subscribe({
      next: () => this.router.navigate(['/saisons', this.seasonId, 'regles']),
      error: () => {
        this.error = 'Impossible de créer la règle. Réessayez.';
        this.saving = false;
      }
    });
  }
}
