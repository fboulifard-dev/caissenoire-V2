import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, NavController } from '@ionic/angular';
import { ParticipationPage } from '../participation/participation.page';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { APP_VERSION } from '../../environments/version';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-seasons',
  templateUrl: './seasons.page.html',
  styleUrls: ['./seasons.page.scss'],
  standalone: false,
})
export class SeasonsPage implements OnInit {
  seasons: any[] = [];
  loading = true;
  error = '';
  userName = 'Utilisateur';
  appVersion = environment.name ? `${APP_VERSION}-${environment.name}` : APP_VERSION;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private modalController: ModalController,
    private navController: NavController
  ) {}

  ngOnInit() {
    const user = this.auth.getCurrentUser();
    this.userName = user?.displayName?.split(/\s+/)[0] || user?.email?.split('@')[0] || 'Utilisateur';
    this.api.getSeasons().subscribe({
      next: (seasons: any) => { this.seasons = seasons || []; this.loading = false; },
      error: () => { this.error = 'Impossible de charger les saisons.'; this.loading = false; }
    });
  }

  async openSeason(season: any) {
    if (!season.active) {
      await this.router.navigate(['/saisons', season.id]);
      return;
    }

    if (season.participationAnswered) {
      if (season.participationResponse === true) {
        await this.router.navigate(['/saisons', season.id]);
      }
      return;
    }

    const modal = await this.modalController.create({
      component: ParticipationPage,
      cssClass: 'participation-modal',
      breakpoints: [0, 0.65, 1],
      initialBreakpoint: 0.65
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.answered) {
      season.participationAnswered = true;
      season.participationResponse = data.participating;
    }
    if (data?.participating === true) {
      await this.router.navigate(['/saisons', season.id]);
    }
  }

  async logout() {
    await this.auth.signOut();
    await this.navController.navigateRoot('/login');
  }
}
