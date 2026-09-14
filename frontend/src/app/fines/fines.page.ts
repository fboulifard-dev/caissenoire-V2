import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-fines',
  templateUrl: './fines.page.html',
  styleUrls: ['./fines.page.scss'],
  standalone: false,
})
export class FinesPage implements OnInit {
  fines: any[] = [];
  loading = true;
  seasonId = '';
  playerId = '';
  playerName = '';
  seasonYear = '';
  readOnly = false;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.ensureSeasonUrl();
    this.playerId = this.route.snapshot.queryParamMap.get('joueur') || '';
  }

  ionViewWillEnter() {
    this.loading = true;
    this.api.getSeasonFines(this.seasonId, this.playerId || undefined).subscribe((data: any) => {
      this.fines = data || [];
      this.loading = false;
    }, () => (this.loading = false));
  }

  private ensureSeasonUrl() {
    const seasonId = this.route.snapshot.paramMap.get('seasonId') || this.route.parent?.snapshot.paramMap.get('seasonId');
    if (seasonId) {
      this.seasonId = seasonId;
      return;
    }
  }

  editFine(fine: any) {
    this.router.navigate(['/saisons', this.seasonId, 'amendes', 'edit', fine.id]);
  }

  async deleteFine(fine: any) {
    const alert = await this.alertController.create({
      header: 'Supprimer l’amende ?',
      message: 'Cette action est irréversible.',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: () => {
            this.api.deleteFine(this.seasonId, fine.id).subscribe({
              next: () => {
                this.fines = this.fines.filter(item => item.id !== fine.id);
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

}
