import { Component } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Router } from '@angular/router';
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(
    private api: ApiService,
    public authService: AuthService,
    private router: Router
  ) {
    this.initializePushNotifications();
  }

  private async initializePushNotifications() {
    if (Capacitor.getPlatform() === 'web') {
      return;
    }

    if (!(await this.authService.authReady())) {
      return;
    }

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') {
      return;
    }

    await PushNotifications.addListener('registration', ({ value }) => {
      this.api.registerDeviceToken(value).subscribe();
    });
    await PushNotifications.register();
  }

  getUserName(user: any): string {
    const displayName = user?.displayName?.trim();
    if (displayName) {
      return displayName;
    }

    return user?.email?.split('@')[0] || 'Utilisateur';
  }

  get currentSeasonId(): string | null {
    const match = this.router.url.match(/^\/saisons\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  get isSeasonPage(): boolean {
    return this.currentSeasonId !== null;
  }

  async logout() {
    await this.authService.signOut();
    await this.router.navigate(['/login']);
  }
}
