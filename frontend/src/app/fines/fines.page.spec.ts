import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonItemSliding } from '@ionic/angular';
import { of, Subject, throwError } from 'rxjs';
import { ApiService } from '../services/api.service';
import { FinesPage } from './fines.page';

describe('FinesPage favorites', () => {
  let page: FinesPage;
  let api: jasmine.SpyObj<ApiService>;
  let sliding: jasmine.SpyObj<IonItemSliding>;
  let present: jasmine.Spy;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['setFineFavorite']);
    sliding = jasmine.createSpyObj<IonItemSliding>('IonItemSliding', ['close']);
    sliding.close.and.resolveTo();
    present = jasmine.createSpy('present').and.resolveTo();
    TestBed.configureTestingModule({
      providers: [
        FinesPage,
        { provide: ApiService, useValue: api },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Router, useValue: {} },
        { provide: AlertController, useValue: { create: jasmine.createSpy().and.resolveTo({ present }) } }
      ]
    });
    page = TestBed.inject(FinesPage);
    page.seasonId = 'season';
    page.isAdmin = true;
  });

  it('adds and removes a shared favorite after successful saves', () => {
    const fine: { id: string; favorite?: boolean } = { id: 'fine' };
    api.setFineFavorite.and.returnValues(of({ favorite: true }), of({ favorite: false }));

    page.toggleFavorite(fine, sliding);
    expect(api.setFineFavorite).toHaveBeenCalledWith('season', 'fine', true);
    expect(fine.favorite).toBeTrue();
    page.toggleFavorite(fine, sliding);
    expect(api.setFineFavorite).toHaveBeenCalledWith('season', 'fine', false);
    expect(fine.favorite).toBeFalse();
    expect(sliding.close).toHaveBeenCalledTimes(2);
  });

  it('prevents duplicate requests and leaves the favorite unchanged on failure', async () => {
    const fine = { id: 'fine', favorite: false };
    const pending = new Subject<{ favorite: boolean }>();
    api.setFineFavorite.and.returnValue(pending);
    page.toggleFavorite(fine, sliding);
    page.toggleFavorite(fine, sliding);
    expect(api.setFineFavorite).toHaveBeenCalledTimes(1);
    pending.error(new Error('Network error'));
    await Promise.resolve();
    expect(fine.favorite).toBeFalse();
    expect(page.pendingFavorites.has('fine')).toBeFalse();
    expect(present).toHaveBeenCalled();

    page.isAdmin = false;
    api.setFineFavorite.and.returnValue(throwError(() => new Error('Unexpected request')));
    page.toggleFavorite(fine, sliding);
    expect(api.setFineFavorite).toHaveBeenCalledTimes(1);
  });
});
