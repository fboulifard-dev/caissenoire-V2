import { CommonModule, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Directive, forwardRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { of, Subject, throwError } from 'rxjs';
import { LoginPage } from '../login/login.page';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { PushNotificationsService } from '../services/push-notifications.service';
import { ForgotPasswordPage } from './forgot-password.page';

@Directive({
  selector: 'ion-input',
  standalone: false,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TestIonInput), multi: true }]
})
class TestIonInput implements ControlValueAccessor {
  writeValue() {}
  registerOnChange() {}
  registerOnTouched() {}
}

describe('ForgotPasswordPage', () => {
  let page: ForgotPasswordPage;
  let api: jasmine.SpyObj<ApiService>;
  let location: jasmine.SpyObj<Location>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['requestPasswordReset']);
    location = jasmine.createSpyObj<Location>('Location', ['getState']);
    location.getState.and.returnValue({ email: ' user@example.com ' });
    TestBed.configureTestingModule({
      providers: [
        ForgotPasswordPage,
        { provide: ApiService, useValue: api },
        { provide: Location, useValue: location }
      ]
    });
    page = TestBed.inject(ForgotPasswordPage);
    page.ionViewWillEnter();
  });

  it('prefills the address from login and requests the link through the backend', async () => {
    api.requestPasswordReset.and.returnValue(of({}));
    await page.sendPasswordReset();
    expect(api.requestPasswordReset).toHaveBeenCalledWith('user@example.com');
    expect(page.resetSent).toBeTrue();
    expect(page.resetError).toBe('');
  });

  it('blocks invalid and duplicate submissions', async () => {
    page.email = 'invalid';
    await page.sendPasswordReset();
    expect(api.requestPasswordReset).not.toHaveBeenCalled();
    page.email = 'user@example.com';
    const response = new Subject<object>();
    api.requestPasswordReset.and.returnValue(response);
    const pending = page.sendPasswordReset();
    await page.sendPasswordReset();
    expect(api.requestPasswordReset).toHaveBeenCalledTimes(1);
    response.next({});
    response.complete();
    await pending;
  });

  it('reports rate limits and other failures without retaining a success message', async () => {
    page.resetSent = true;
    api.requestPasswordReset.and.returnValue(throwError(() => new HttpErrorResponse({ status: 429 })));
    await page.sendPasswordReset();
    expect(page.resetSent).toBeFalse();
    expect(page.resetError).toContain('Trop de tentatives');
    api.requestPasswordReset.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    await page.sendPasswordReset();
    expect(page.resetError).toContain('Impossible');
  });

  it('clears stale state when opened directly', () => {
    location.getState.and.returnValue({});
    page.resetSent = true;
    page.resetError = 'error';
    page.ionViewWillEnter();
    expect(page.email).toBe('');
    expect(page.resetSent).toBeFalse();
    expect(page.resetError).toBe('');
  });
});

describe('Password recovery pages', () => {
  it('links from login to the dedicated page without putting the email in the URL', async () => {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['isLoggedIn']);
    auth.isLoggedIn.and.returnValue(false);
    await TestBed.configureTestingModule({
      declarations: [LoginPage, TestIonInput],
      imports: [CommonModule, FormsModule, RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: ApiService, useValue: {} },
        { provide: PushNotificationsService, useValue: {} }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(LoginPage);
    fixture.componentInstance.email = 'user@example.com';
    fixture.detectChanges();
    const link = fixture.debugElement.queryAll(By.directive(RouterLink))
      .map(element => element.injector.get(RouterLink))
      .find(item => item.urlTree?.toString() === '/forgot-password');
    expect(link).toBeDefined();
    expect(link?.state).toEqual({ email: 'user@example.com' });
    expect(fixture.nativeElement.querySelector('ion-input[name="resetEmail"]')).toBeNull();
  });

  it('renders the dedicated form and submits it', async () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['requestPasswordReset']);
    api.requestPasswordReset.and.returnValue(of({}));
    await TestBed.configureTestingModule({
      declarations: [ForgotPasswordPage, TestIonInput],
      imports: [CommonModule, FormsModule, RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [{ provide: ApiService, useValue: api }]
    }).compileComponents();
    const fixture = TestBed.createComponent(ForgotPasswordPage);
    fixture.componentInstance.email = 'user@example.com';
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('ion-input[name="resetEmail"]')).not.toBeNull();
    element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.requestPasswordReset).toHaveBeenCalledWith('user@example.com');
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Si un compte correspond');
  });
});
