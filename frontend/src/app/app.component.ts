import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Title } from '@angular/platform-browser';
import { AuthService } from './services/auth.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(
    public authService: AuthService,
    private router: Router,
    private navController: NavController,
    title: Title
  ) {
    if (environment.titlePrefix) {
      title.setTitle(`${environment.titlePrefix} ${title.getTitle()}`);
    }
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
    await this.navController.navigateRoot('/login');
  }
}
