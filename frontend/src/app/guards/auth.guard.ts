import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const api = inject(ApiService);

  const isLoggedIn = await auth.authReady();

  if (!isLoggedIn) {
    return router.createUrlTree(['/login']);
  }

  try {
    const status: any = await firstValueFrom(api.getActiveParticipation());
    if (status.participating !== true || status.notificationsEnabled === null) {
      return router.createUrlTree(['/participation']);
    }
  } catch {
    return true;
  }

  return true;
};

export const verifiedAuthGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return await auth.authReady() ? true : router.createUrlTree(['/login']);
};
