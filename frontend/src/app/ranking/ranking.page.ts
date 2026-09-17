import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-ranking',
  templateUrl: './ranking.page.html',
  styleUrls: ['./ranking.page.scss'],
  standalone: false,
})
export class RankingPage implements OnInit {
  ranking: any[] = [];
  loading = true;
  seasonId = '';

  constructor(
    private api: ApiService,
    private route: ActivatedRoute
) {}

  ngOnInit() {
    this.ensureSeasonUrl();
    this.api.getSeasonRanking(this.seasonId).subscribe({
      next: (ranking: any) => {
        this.ranking = ranking || [];
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  get totalFines(): number {
    return this.ranking.reduce((total, player) => total + this.amount(player.finesTotal), 0);
  }

  finesShare(player: any): number {
    if (this.totalFines === 0) {
      return 0;
    }

    return Math.min(100, (this.amount(player.finesTotal) / this.totalFines) * 100);
  }

  private amount(value: unknown): number {
    const amount = Number(value || 0);
    return Number.isFinite(amount) ? amount : 0;
  }

  private ensureSeasonUrl() {
    const seasonId = this.route.snapshot.paramMap.get('seasonId') || this.route.parent?.snapshot.paramMap.get('seasonId');
    if (seasonId) {
      this.seasonId = seasonId;
      return;
    }
  }
}
