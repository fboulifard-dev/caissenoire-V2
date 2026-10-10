import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

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
