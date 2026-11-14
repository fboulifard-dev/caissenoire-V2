import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { ApiService } from '../services/api.service';
import { FineCreatePage } from './fine-create.page';

describe('FineCreatePage favorites', () => {
  let page: FineCreatePage;
  let api: jasmine.SpyObj<ApiService>;
  let route: { snapshot: { paramMap: ReturnType<typeof convertToParamMap> } };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', [
      'getSeason', 'getSeasonPlayers', 'getSeasonRules', 'getSeasonFines', 'createFine', 'updateFine'
    ]);
    api.getSeason.and.returnValue(of({ player: { roles: ['ADMIN'] }, readOnly: false }));
    api.getSeasonPlayers.and.returnValue(of([]));
    api.getSeasonRules.and.returnValue(of([]));
    api.createFine.and.returnValue(of({}));
    api.updateFine.and.returnValue(of({}));
    route = { snapshot: { paramMap: convertToParamMap({ seasonId: 'season' }) } };
    TestBed.configureTestingModule({
      providers: [
        FineCreatePage,
        { provide: ApiService, useValue: api },
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: { navigate: jasmine.createSpy().and.resolveTo(true) } }
      ]
    });
    page = TestBed.inject(FineCreatePage);
  });

  it('creates selected players’ fines as favorites and resets the form on re-entry', async () => {
    page.ionViewWillEnter();
    expect(page.fine.favorite).toBeFalse();
    page.fine.playerIds = ['one', 'two'];
    page.fine.ruleId = 'rule';
    page.fine.favorite = true;
    await page.submit();
    expect(api.createFine).toHaveBeenCalledWith('season', jasmine.objectContaining({
      playerIds: ['one', 'two'], favorite: true
    }));
    page.ionViewWillEnter();
    expect(page.fine.favorite).toBeFalse();
  });

  it('loads the existing favorite and sends a change when editing', async () => {
    route.snapshot.paramMap = convertToParamMap({ seasonId: 'season', fineId: 'fine' });
    api.getSeasonFines.and.returnValue(of([{ id: 'fine', playerId: 'one', ruleId: 'rule', favorite: true }]));
    page.ionViewWillEnter();
    expect(page.fine.favorite).toBeTrue();
    page.fine.favorite = false;
    await page.submit();
    expect(api.updateFine).toHaveBeenCalledWith('season', 'fine', jasmine.objectContaining({ favorite: false }));
  });

  it('does not overwrite a favorite changed elsewhere when the form leaves it unchanged', async () => {
    route.snapshot.paramMap = convertToParamMap({ seasonId: 'season', fineId: 'fine' });
    api.getSeasonFines.and.returnValue(of([{ id: 'fine', playerId: 'one', ruleId: 'rule', favorite: true }]));
    page.ionViewWillEnter();
    await page.submit();
    expect(api.updateFine).toHaveBeenCalled();
    expect(api.updateFine.calls.mostRecent().args[2].favorite).toBeUndefined();
  });
});
