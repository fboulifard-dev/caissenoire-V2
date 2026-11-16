import { TestBed } from '@angular/core/testing';
import { Directive, forwardRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { User } from 'firebase/auth';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { SignupPage } from './signup.page';

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

describe('SignupPage verification email', () => {
  let page: SignupPage;
  let auth: jasmine.SpyObj<AuthService>;
  let api: jasmine.SpyObj<ApiService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isLoggedIn', 'createAccount', 'updateAccountName']);
    auth.isLoggedIn.and.returnValue(false);
    auth.createAccount.and.resolveTo({
      user: jasmine.createSpyObj<User>('User', ['getIdToken']),
      providerId: null,
      operationType: 'signIn'
    });

    auth.updateAccountName.and.resolveTo();
    api = jasmine.createSpyObj<ApiService>('ApiService', ['sendVerificationEmail', 'checkAccountAvailability']);
    api.checkAccountAvailability.and.returnValue(of({ available: true }));
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        SignupPage,
        { provide: AuthService, useValue: auth },
        { provide: ApiService, useValue: api },
        { provide: Router, useValue: router }
      ]
    });
    page = TestBed.inject(SignupPage);
    page.email = 'user@example.com';
    page.password = 'Password123!';
    page.confirmPassword = page.password;
    page.firstName = ' Alice ';
    page.lastName = ' Martin ';
  });

  it('checks availability before collecting names and creating the account', async () => {
    api.sendVerificationEmail.and.returnValue(of({}));
    spyOn(window, 'alert');
    await page.checkAvailability();
    expect(api.checkAccountAvailability).toHaveBeenCalledWith('user@example.com');
    expect(page.personalInfoStep).toBeTrue();
    expect(auth.createAccount).not.toHaveBeenCalled();
    await page.createAccount();
    expect(auth.updateAccountName).toHaveBeenCalledWith(jasmine.anything(), 'Alice Martin');
    expect(api.sendVerificationEmail).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('does not continue if the address is taken or the check fails', async () => {
    api.checkAccountAvailability.and.returnValue(of({ available: false }));
    await page.checkAvailability();
    expect(page.personalInfoStep).toBeFalse();
    expect(page.error).toContain('possède déjà un compte');
    api.checkAccountAvailability.and.returnValue(throwError(() => new Error('network')));
    await page.checkAvailability();
    expect(page.personalInfoStep).toBeFalse();
    expect(page.error).toContain('Impossible de vérifier');
  });

  it('does not continue when the email changes during the availability check', async () => {
    const response = new Subject<{ available: boolean }>();
    api.checkAccountAvailability.and.returnValue(response);
    const checking = page.checkAvailability();
    page.email = 'other@example.com';
    response.next({ available: true });
    await checking;
    expect(page.personalInfoStep).toBeFalse();
    expect(page.error).toContain('informations ont changé');
  });

  it('does not submit either step while a request is running', async () => {
    page.loading = true;
    await page.checkAvailability();
    expect(api.checkAccountAvailability).not.toHaveBeenCalled();
    page.personalInfoStep = true;
    await page.createAccount();
    expect(auth.createAccount).not.toHaveBeenCalled();
  });

  it('returns to the first step if the account is created elsewhere meanwhile', async () => {
    await page.checkAvailability();
    auth.createAccount.and.rejectWith({ code: 'auth/email-already-in-use' });
    await page.createAccount();
    expect(page.personalInfoStep).toBeFalse();
    expect(page.error).toContain('possède déjà un compte');
    expect(api.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('requires both names and retries email delivery without recreating the account', async () => {
    await page.checkAvailability();
    page.lastName = ' ';
    await page.createAccount();
    expect(auth.createAccount).not.toHaveBeenCalled();
    page.lastName = 'Martin';
    api.sendVerificationEmail.and.returnValue(throwError(() => new Error('SMTP failed')));
    await page.createAccount();
    expect(page.error).toContain('compte a été créé');
    expect(page.canGoBack).toBeFalse();
    expect(router.navigate).not.toHaveBeenCalled();
    api.sendVerificationEmail.and.returnValue(of({}));
    spyOn(window, 'alert');
    await page.createAccount();
    expect(auth.createAccount).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});

describe('SignupPage form steps', () => {
  it('displays the name fields only after the email availability check', async () => {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['isLoggedIn']);
    auth.isLoggedIn.and.returnValue(false);
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['checkAccountAvailability']);
    api.checkAccountAvailability.and.returnValue(of({ available: true }));
    await TestBed.configureTestingModule({
      declarations: [SignupPage, TestIonInput],
      imports: [CommonModule, FormsModule, RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: ApiService, useValue: api }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(SignupPage);
    const page = fixture.componentInstance;
    page.email = 'user@example.com';
    page.password = 'Password123!';
    page.confirmPassword = page.password;
    fixture.detectChanges();

    const form: HTMLElement = fixture.nativeElement;
    expect(form.querySelector('ion-input[name="email"]')).not.toBeNull();
    expect(form.querySelector('ion-input[name="firstName"]')).toBeNull();
    expect(form.querySelector('ion-input[name="lastName"]')).toBeNull();

    const check = spyOn(page, 'checkAvailability').and.callThrough();
    form.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(check).toHaveBeenCalledTimes(1);
    expect(form.querySelector('ion-input[name="email"]')).toBeNull();
    expect(form.querySelector('ion-input[name="firstName"]')).not.toBeNull();
    expect(form.querySelector('ion-input[name="lastName"]')).not.toBeNull();

    const create = spyOn(page, 'createAccount').and.stub();
    form.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(create).toHaveBeenCalledTimes(1);

    page.backToCredentials();
    fixture.detectChanges();
    expect(form.querySelector('ion-input[name="email"]')).not.toBeNull();
    expect(form.querySelector('ion-input[name="firstName"]')).toBeNull();
    expect(form.querySelector('ion-input[name="lastName"]')).toBeNull();
  });
});
