import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-players',
  templateUrl: './players.page.html',
  standalone: false,
})
export class PlayersPage implements OnInit {
  players: any[] = [];
  seasonId = '';
  loading = true;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.seasonId = this.route.snapshot.paramMap.get('seasonId') || this.route.parent?.snapshot.paramMap.get('seasonId') || '';
    if (!this.seasonId) {
      this.loading = false;
      return;
    }

    this.api.getSeasonPlayers(this.seasonId).subscribe({
      next: (players: any) => {
        this.players = players || [];
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  back() {
    this.router.navigate(['/saisons', this.seasonId]);
  }
}