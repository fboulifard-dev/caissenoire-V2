import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-participation',
  templateUrl: './participation.page.html',
  styleUrls: ['./participation.page.scss'],
  standalone: false,
})
export class ParticipationPage implements OnInit {
  status: any = null;
  loading = true;
  saving = false;
  error = '';
  readonly isNative = Capacitor.getPlatform() !== 'web';

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.api.getActiveParticipation().subscribe({
      next: (status: any) => {
        this.status = status;
        this.loading = false;
        if (status.participating === true && status.notificationsEnabled !== null) {
          this.router.navigate(['/saisons'], { replaceUrl: true });
        }
      },
      error: () => {
        this.error = 'Impossible de charger la saison active. Réessayez.';
        this.loading = false;
      }
    });
  }

  answerParticipation(participating: boolean) {
    if (this.saving) return;
    this.saving = true;
    this.error = '';
    this.api.answerActiveParticipation(participating).subscribe({
      next: (status: any) => {
        this.status = { ...this.status, ...status };
        this.saving = false;
        if (!participating) {
          this.status.participating = false;
        }
      },
      error: () => {
        this.error = 'Impossible d’enregistrer votre réponse. Réessayez.';
        this.saving = false;
      }
    });
  }

  answerNotifications(enabled: boolean) {
    if (this.saving) return;
    this.saving = true;
    this.error = '';
    this.api.setActiveNotificationConsent(enabled).subscribe({
      next: () => {
        this.status.notificationsEnabled = enabled;
        void this.finishOnboarding(enabled);
      },
      error: () => {
        this.error = 'Impossible d’enregistrer votre choix. Réessayez.';
        this.saving = false;
      }
    });
  }

  private async finishOnboarding(enableNotifications: boolean) {
    if (enableNotifications && this.isNative) {
      try {
        const permission = await PushNotifications.requestPermissions();
        if (permission.receive === 'granted') {
          const seasonId = this.status.season.id;
          await PushNotifications.addListener('registration', ({ value }) => {
            this.api.registerDeviceToken(seasonId, value).subscribe({
              error: error => console.error('Device token registration failed:', error)
            });
          });
          await PushNotifications.register();
        }
      } catch (error) {
        console.error('Push notification setup failed:', error);
      }
    }

    await this.router.navigate(['/saisons'], { replaceUrl: true });
  }

  async logout() {
    await this.auth.signOut();
    await this.router.navigate(['/login'], { replaceUrl: true });
  }
}