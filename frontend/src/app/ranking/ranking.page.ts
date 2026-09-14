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

  private ensureSeasonUrl() {
    const seasonId = this.route.snapshot.paramMap.get('seasonId') || this.route.parent?.snapshot.paramMap.get('seasonId');
    if (seasonId) {
      this.seasonId = seasonId;
      return;
    }
  }
}
