import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-seasons',
  templateUrl: './seasons.page.html',
  standalone: false,
})
export class SeasonsPage implements OnInit {
  seasons: any[] = [];
  loading = true;
  error = '';
  userName = 'Utilisateur';

  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  ngOnInit() {
    const user = this.auth.getCurrentUser();
    this.userName = user?.displayName?.split(/\s+/)[0] || user?.email?.split('@')[0] || 'Utilisateur';
    this.api.getSeasons().subscribe({
      next: (seasons: any) => { this.seasons = seasons || []; this.loading = false; },
      error: () => { this.error = 'Impossible de charger les saisons.'; this.loading = false; }
    });
  }

  openSeason(season: any) {
    this.router.navigate(['/saisons', season.id]);
  }

  async logout() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}
