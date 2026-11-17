import { CommonModule, Location } from '@angular/common';
import { Directive, forwardRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from '../services/auth.service';
import { ResetPasswordPage } from './reset-password.page';
import { PasswordRequirementsComponent } from '../shared/password-requirements/password-requirements.component';

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

describe('ResetPasswordPage', () => {
  let page: ResetPasswordPage;
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let location: jasmine.SpyObj<Location>;
  let route: { snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> } };

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['verifyPasswordResetCode', 'confirmPasswordReset']);
    auth.verifyPasswordResetCode.and.resolveTo('user@example.com');
    auth.confirmPasswordReset.and.resolveTo();
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    location = jasmine.createSpyObj<Location>('Location', ['replaceState']);
    route = { snapshot: { queryParamMap: convertToParamMap({ mode: 'resetPassword', oobCode: 'code' }) } };
    TestBed.configureTestingModule({
      providers: [
        ResetPasswordPage,
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: Location, useValue: location },
        { provide: ActivatedRoute, useValue: route }
      ]
    });

    page = TestBed.inject(ResetPasswordPage);
  });

  it('validates the link and changes the password before navigating to login', async () => {
    await page.ionViewWillEnter();
    expect(location.replaceState).toHaveBeenCalledWith('/reset-password');
    expect(auth.verifyPasswordResetCode).toHaveBeenCalledWith('code');
    page.password = 'Password123!';
    page.confirmPassword = page.password;
    await page.submit();
    expect(auth.confirmPasswordReset).toHaveBeenCalledWith('code', 'Password123!');
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { passwordReset: 'success' }, replaceUrl: true
    });
    expect(page.password).toBe('');
  });

  it('prevents invalid, mismatched and duplicate submissions', async () => {
    await page.ionViewWillEnter();
    page.password = 'short';
    page.confirmPassword = 'short';
    await page.submit();
    page.password = 'Password123!';
    page.confirmPassword = 'different';
    await page.submit();
    page.confirmPassword = page.password;
    page.loading = true;
    await page.submit();
    expect(auth.confirmPasswordReset).not.toHaveBeenCalled();
  });

  it('rejects invalid modes and expired links without changing the password', async () => {
    route.snapshot.queryParamMap = convertToParamMap({ mode: 'verifyEmail', oobCode: 'code' });
    await page.ionViewWillEnter();
    expect(auth.verifyPasswordResetCode).not.toHaveBeenCalled();
    expect(page.linkInvalid).toBeTrue();
    route.snapshot.queryParamMap = convertToParamMap({ mode: 'resetPassword', oobCode: 'expired' });
    auth.verifyPasswordResetCode.and.rejectWith({ code: 'auth/expired-action-code' });
    await page.ionViewWillEnter();
    expect(page.error).toContain('invalide ou a expiré');
    expect(page.linkValid).toBeFalse();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('allows retrying a network error and reports a code expiring on submission', async () => {
    auth.verifyPasswordResetCode.and.rejectWith({ code: 'auth/network-request-failed' });
    await page.ionViewWillEnter();
    expect(page.error).toContain('réessayez');
    expect(page.linkInvalid).toBeFalse();
    auth.verifyPasswordResetCode.and.resolveTo('user@example.com');
    await page.checkLink();
    expect(page.linkValid).toBeTrue();
    page.password = 'Password123!';
    page.confirmPassword = page.password;
    auth.confirmPasswordReset.and.rejectWith({ code: 'auth/expired-action-code' });
    await page.submit();
    expect(page.linkInvalid).toBeTrue();
    expect(page.error).toContain('invalide ou a expiré');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});

describe('ResetPasswordPage form', () => {
  it('displays the password fields for a valid link and submits the form', async () => {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['verifyPasswordResetCode', 'confirmPasswordReset']);
    auth.verifyPasswordResetCode.and.resolveTo('user@example.com');
    auth.confirmPasswordReset.and.resolveTo();
    const params = convertToParamMap({ mode: 'resetPassword', oobCode: 'code' });
    await TestBed.configureTestingModule({
      declarations: [ResetPasswordPage, TestIonInput],
      imports: [CommonModule, FormsModule, RouterTestingModule, PasswordRequirementsComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: params } } },
        { provide: Location, useValue: { replaceState: jasmine.createSpy('replaceState') } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate').and.resolveTo(true) } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(ResetPasswordPage);
    await fixture.componentInstance.ionViewWillEnter();
    fixture.componentInstance.password = 'abcdefghij';
    fixture.componentInstance.confirmPassword = 'different';
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('ion-input[name="password"]')).not.toBeNull();
    expect(element.querySelector('ion-input[name="confirmPassword"]')).not.toBeNull();
    expect(element.textContent).toContain('Les mots de passe ne correspondent pas');
    const requirements = Array.from(element.querySelectorAll('.password-requirements [role="listitem"]'));
    expect(requirements.map(item => item.textContent?.trim())).toEqual([
      'Au moins 10 caractères', 'Une lettre majuscule', 'Une lettre minuscule', 'Un chiffre', 'Un caractère spécial'
    ]);
    expect(requirements.map(item => item.classList.contains('met'))).toEqual([true, false, true, false, false]);
    fixture.componentInstance.password = 'Password123!';
    fixture.componentInstance.confirmPassword = 'Password123!';
    fixture.detectChanges();
    expect(requirements.map(item => item.classList.contains('met'))).toEqual([true, true, true, true, true]);
    element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(auth.confirmPasswordReset).toHaveBeenCalledWith('code', 'Password123!');
  });
});
