import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, Router, RouterModule } from '@angular/router';
import { AlertController, IonicModule, IonItemSliding } from '@ionic/angular';
import { defineCustomElements } from '@ionic/core/loader';
import { of, Subject, throwError } from 'rxjs';
import { ApiService } from '../services/api.service';
import { FinesPage } from './fines.page';

describe('FinesPage favorites', () => {
  let page: FinesPage;
  let api: jasmine.SpyObj<ApiService>;
  let sliding: jasmine.SpyObj<IonItemSliding>;
  let present: jasmine.Spy;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['setFineFavorite']);
    sliding = jasmine.createSpyObj<IonItemSliding>('IonItemSliding', ['close']);
    sliding.close.and.resolveTo();
    present = jasmine.createSpy('present').and.resolveTo();
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        FinesPage,
        { provide: ApiService, useValue: api },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Router, useValue: router },
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

  it('combines rule, favorite and match-day filters for groups and totals', () => {
    page.fines = [
      { id: 'one', date: '2026-01-01', ruleId: 'rule', amount: 10, favorite: true, matchDay: true },
      { id: 'two', date: '2026-01-01', ruleId: 'rule', amount: 20, favorite: true, matchDay: false },
      { id: 'three', date: '2026-01-02', ruleId: 'other', amount: 30, favorite: true, matchDay: true },
      { id: 'four', date: '2026-01-02', ruleId: 'rule', amount: 40, matchDay: true }
    ];
    page.selectedRuleId = 'rule';
    page.favoritesOnly = true;
    page.matchDayOnly = true;
    page.onFilterChanged();
    expect(page.filteredFines.map(fine => fine.id)).toEqual(['one']);
    expect(page.totalFineAmount).toBe(10);
    expect(page.fineGroups.length).toBe(1);
    expect(page.fineGroups[0].total).toBe(10);
    expect(page.visibleFineGroups[0].items.map(fine => fine.id)).toEqual(['one']);
    expect(page.hasMore).toBeFalse();

    page.matchDayOnly = false;
    page.onFilterChanged();
    expect(page.filteredFines.map(fine => fine.id)).toEqual(['one', 'two']);
    expect(page.totalFineAmount).toBe(30);
  });

  it('updates the visible results when a favorite is removed', () => {
    const fine = { id: 'fine', favorite: true, date: '2026-01-01', amount: 5 };
    page.fines = [fine];
    page.favoritesOnly = true;
    page.onFilterChanged();
    api.setFineFavorite.and.returnValue(of({ favorite: false }));
    page.toggleFavorite(fine, sliding);
    expect(page.filteredFines).toEqual([]);
    expect(page.fineGroups).toEqual([]);
    expect(page.totalFineAmount).toBe(0);
  });

  it('offers historical rules and resets player and rule filters together', async () => {
    page.rules = [{ id: 'current', label: 'Actuelle' }];
    page.fines = [{ ruleId: 'old', ruleLabel: 'Ancienne' }, {}];
    expect(page.filterRules).toEqual([
      { id: 'current', label: 'Actuelle' },
      { id: 'old', label: 'Ancienne' },
      { id: 'unknown', label: 'Règle inconnue' }
    ]);
    page.selectedRuleId = 'old';
    page.playerId = 'player';
    page.favoritesOnly = true;
    page.matchDayOnly = true;
    await page.resetFineFilters();
    expect(page.favoritesOnly).toBeFalse();
    expect(page.matchDayOnly).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { joueur: null, regle: null }, queryParamsHandling: 'merge'
    }));
  });

  it('sets the player query without discarding other filters', async () => {
    await page.setPlayerFilter('player');
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { joueur: 'player' }, queryParamsHandling: 'merge'
    }));
    await page.setPlayerFilter('');
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { joueur: null }, queryParamsHandling: 'merge'
    }));
  });
});

describe('FinesPage player filter', () => {
  let page: FinesPage;
  let api: jasmine.SpyObj<ApiService>;
  let query: Subject<ReturnType<typeof convertToParamMap>>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', [
      'getSeasonFines', 'getSeasonRules', 'getSeasonPlayers', 'getSeason'
    ]);
    api.getSeasonFines.and.callFake((_season, playerId) => of(playerId
      ? [{ playerId, ruleId: 'rule', favorite: true, matchDay: true, amount: 5 }]
      : [{ playerId: 'one', ruleId: 'rule', amount: 5 }, { playerId: 'two', ruleId: 'other', amount: 10 }]));
    api.getSeasonRules.and.returnValue(of([{ id: 'rule', label: 'Règle' }]));
    api.getSeasonPlayers.and.returnValue(of([
      { id: 'one', firstName: 'Alice', lastName: 'Martin' },
      { id: 'two', name: 'Zoe' }
    ]));
    api.getSeason.and.returnValue(of({ player: { roles: ['ADMIN'] } }));
    query = new Subject();
    const empty = convertToParamMap({});
    TestBed.configureTestingModule({
      providers: [
        FinesPage,
        { provide: ApiService, useValue: api },
        { provide: Router, useValue: { navigate: jasmine.createSpy().and.resolveTo(true) } },
        { provide: AlertController, useValue: {} },
        { provide: ActivatedRoute, useValue: {
          snapshot: { paramMap: convertToParamMap({ seasonId: 'season' }), queryParamMap: empty },
          queryParamMap: query
        } }
      ]
    });
    page = TestBed.inject(FinesPage);
    page.ngOnInit();
  });

  afterEach(() => page.ngOnDestroy());

  it('loads all players and combines the chosen player with the other filters', () => {
    page.ionViewWillEnter();
    expect(api.getSeasonPlayers).toHaveBeenCalledWith('season');
    expect(page.filterPlayers).toEqual([
      { id: 'one', label: 'Alice Martin' }, { id: 'two', label: 'Zoe' }
    ]);
    page.favoritesOnly = true;
    page.matchDayOnly = true;
    query.next(convertToParamMap({ joueur: 'one', regle: 'rule' }));
    expect(api.getSeasonFines).toHaveBeenCalledWith('season', 'one');
    expect(page.playerName).toBe('Alice Martin');
    expect(page.filteredFines.length).toBe(1);
    expect(page.totalFineAmount).toBe(5);
  });

  it('reports player loading errors and can retry', () => {
    api.getSeasonPlayers.and.returnValues(throwError(() => new Error('Offline')), of([{ id: 'one', name: 'Alice' }]));
    page.ionViewWillEnter();
    expect(page.playersLoadError).toBeTrue();
    expect(page.fines.length).toBe(2);
    page.loadFines();
    expect(page.playersLoadError).toBeFalse();
    expect(page.filterPlayers).toEqual([{ id: 'one', label: 'Alice' }]);
  });
});

describe('FinesPage filter menu', () => {
  it('opens the side menu without enabling the swipe gesture', async () => {
    await defineCustomElements(window);
    const params = convertToParamMap({});
    await TestBed.configureTestingModule({
      declarations: [FinesPage],
      imports: [CommonModule, FormsModule, RouterModule.forRoot([]), IonicModule.forRoot()],
      providers: [
        { provide: ApiService, useValue: {} },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: params, queryParamMap: params }, queryParamMap: of(params) } }
      ]
    }).compileComponents();
    const app = document.createElement('ion-app');
    document.body.appendChild(app);
    const fixture = TestBed.createComponent(FinesPage);
    app.appendChild(fixture.nativeElement);
    fixture.detectChanges();

    try {
      const menu: HTMLIonMenuElement = fixture.nativeElement.querySelector('ion-menu');
      await menu.componentOnReady();
      const button: HTMLIonButtonElement = fixture.nativeElement.querySelector('ion-header.statistics-header ion-button');
      await button.componentOnReady();
      expect(menu.menuId).toBe(fixture.componentInstance.filterMenuId);
      expect(menu.swipeGesture).toBeFalse();
      button.click();
      await new Promise(resolve => setTimeout(resolve, 600));
      expect(await menu.isOpen()).toBeTrue();
      expect(menu.side).toBe('end');
      const fields: HTMLElement = menu.querySelector('.fine-filter-fields')!;
      const container: HTMLElement = menu.shadowRoot!.querySelector('.menu-inner')!;
      expect(fields.getBoundingClientRect().width).toBeLessThan(container.getBoundingClientRect().width);
      expect(getComputedStyle(fields).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      const item: HTMLIonItemElement = fields.querySelector('ion-item')!;
      await item.componentOnReady();
      expect(getComputedStyle(item).getPropertyValue('--background').trim()).toBe('transparent');
      const closeButton: HTMLIonButtonElement = menu.querySelector('ion-button')!;
      closeButton.click();
      await new Promise(resolve => setTimeout(resolve, 600));
      expect(await menu.isOpen()).toBeFalse();
    } finally {
      fixture.destroy();
      app.remove();
    }
  });
});
