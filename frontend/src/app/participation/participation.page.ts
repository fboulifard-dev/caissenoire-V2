import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ApiService } from '../services/api.service';
import { firstValueFrom } from 'rxjs';
import { PushNotificationsService } from '../services/push-notifications.service';

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

  constructor(
    private api: ApiService,
    private modalController: ModalController,
    private pushNotifications: PushNotificationsService
  ) {}

  ngOnInit() {
    this.api.getActiveParticipation().subscribe({
      next: (status: any) => {
        this.status = status;
        this.loading = false;
        if (status.participating !== null) {
          void this.modalController.dismiss({ answered: true, participating: status.participating });
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
        if (participating) {
          void this.registerPushToken();
        }
        void this.modalController.dismiss({ answered: true, participating });
      },
      error: () => {
        this.error = 'Impossible d’enregistrer votre réponse. Réessayez.';
        this.saving = false;
      }
    });
  }

  closeModal() {
    return this.modalController.dismiss({ answered: false, participating: null });
  }

  private async registerPushToken() {
    try {
      const token = await this.pushNotifications.getTokenIfPermissionGranted();
      if (token) {
        await firstValueFrom(this.api.registerDeviceToken(token));
      }
    } catch {
      // Notification registration must not block participation.
    }
  }
}