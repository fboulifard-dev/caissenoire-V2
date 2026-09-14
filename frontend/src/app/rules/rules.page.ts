import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-rules',
  templateUrl: './rules.page.html',
  standalone: false,
})
export class RulesPage implements OnInit {
  rules: any[] = [];
  seasonId = '';
  seasonYear = '';
  readOnly = true;
  isAdmin = false;
  loading = true;

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.seasonId = this.route.snapshot.paramMap.get('seasonId') || this.route.parent?.snapshot.paramMap.get('seasonId') || '';
    if (!this.seasonId) return;
    this.api.getSeason(this.seasonId).subscribe((season: any) => {
      this.seasonYear = season.name || season.id;
      this.readOnly = season.readOnly === true;
      this.isAdmin = season.player?.roles?.includes('ADMIN') && !this.readOnly;
    });
    this.loadRules();
  }

  loadRules() {
    this.api.getSeasonRules(this.seasonId).subscribe({
      next: (rules: any) => { this.rules = rules || []; this.loading = false; },
      error: () => (this.loading = false)
    });
  }

  disableRule(rule: any) {
    this.api.updateRule(rule.id, { label: rule.label, cost: Number(rule.cost), matchDay: !!rule.matchDay, active: false }, this.seasonId)
      .subscribe(() => rule.active = false);
  }

  enableRule(rule: any) {
    this.api.updateRule(rule.id, { label: rule.label, cost: Number(rule.cost), matchDay: !!rule.matchDay, active: true }, this.seasonId)
      .subscribe(() => rule.active = true);
  }

  back() {
    this.router.navigate(['/saisons', this.seasonId]);
  }
}
