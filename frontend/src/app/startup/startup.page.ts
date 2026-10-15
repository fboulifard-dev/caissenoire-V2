import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, from, timeout } from 'rxjs';
import { APP_VERSION } from '../../environments/version';
import { environment } from '../../environments/environment';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-startup',
  templateUrl: './startup.page.html',
  styleUrls: ['./startup.page.scss'],
  standalone: false,
})
export class StartupPage implements OnInit {
  loading = true;
  loadingMessage = 'Connexion en cours';
  error = '';
  appVersion = environment.name ? `${APP_VERSION}-${environment.name}` : APP_VERSION;

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    void this.continueToApp();
  }

  async retry() {
    await this.continueToApp();
  }

  private async continueToApp() {
    const startedAt = Date.now();
    this.loading = true;
    this.error = '';

    try {
      this.loadingMessage = 'Restauration du compte';
      if (!await this.waitFor(this.auth.authReady())) {
        await this.waitForMinimumDisplay(startedAt);
        await this.router.navigateByUrl('/login', { replaceUrl: true });
        return;
      }

      this.loadingMessage = 'Actualisation de la session';
      if (!await this.waitFor(this.auth.getAccessToken(true))) {
        await this.waitForMinimumDisplay(startedAt);
        await this.router.navigateByUrl('/login', { replaceUrl: true });
        return;
      }

      this.loadingMessage = 'Vérification de la saison active';
      const participation: any = await firstValueFrom(
        this.api.getActiveParticipation().pipe(timeout({ first: 15000 }))
      );
      const destination = participation?.participating === true && participation?.season?.id
        ? ['/saisons', participation.season.id]
        : ['/saisons'];
      await this.waitForMinimumDisplay(startedAt);
      await this.router.navigate(destination, { replaceUrl: true });
    } catch {
      this.error = `${this.loadingMessage} a échoué. Vérifiez votre connexion puis réessayez.`;
    } finally {
      await this.waitForMinimumDisplay(startedAt);
      this.loading = false;
    }
  }

  private waitForMinimumDisplay(startedAt: number): Promise<void> {
    const remaining = 3000 - (Date.now() - startedAt);
    return remaining > 0 ? new Promise(resolve => setTimeout(resolve, remaining)) : Promise.resolve();
  }

  private waitFor<T>(promise: Promise<T>): Promise<T> {
    return firstValueFrom(from(promise).pipe(timeout({ first: 15000 })));
  }
}