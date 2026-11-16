import { convertToParamMap, Router, ActivatedRoute } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { PushNotificationsService } from '../services/push-notifications.service';
import { LoginPage } from './login.page';

describe('LoginPage email verification', () => {
  let page: LoginPage;
  let auth: jasmine.SpyObj<AuthService>;
  let api: jasmine.SpyObj<ApiService>;
  let route: { snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> } };
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isLoggedIn', 'verifyEmail', 'signInEmail', 'requestPasswordReset']);
    auth.isLoggedIn.and.returnValue(false);
    auth.verifyEmail.and.resolveTo();
    api = jasmine.createSpyObj<ApiService>('ApiService', ['sendVerificationEmail']);
    route = { snapshot: { queryParamMap: convertToParamMap({ mode: 'verifyEmail', oobCode: 'code' }) } };
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
    router.navigate.and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        LoginPage,
        { provide: AuthService, useValue: auth },
        { provide: ApiService, useValue: api },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: PushNotificationsService, useValue: {} }
      ]
    });
    page = TestBed.inject(LoginPage);
  });

  it('validates the code, removes it from the URL and shows the login message', async () => {
    await page.ionViewWillEnter();
    expect(auth.verifyEmail).toHaveBeenCalledWith('code');
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
    expect(page.verificationMessage).toContain('compte a été validé');
    expect(page.verificationError).toBe('');
  });

  it('does not report success for expired or invalid links', async () => {
    auth.verifyEmail.and.rejectWith(new Error('expired'));
    await page.ionViewWillEnter();
    expect(page.verificationMessage).toBe('');
    expect(page.verificationError).toContain('invalide ou a expiré');
    route.snapshot.queryParamMap = convertToParamMap({ mode: 'resetPassword', oobCode: 'code' });
    auth.verifyEmail.calls.reset();
    await page.ionViewWillEnter();
    expect(auth.verifyEmail).not.toHaveBeenCalled();
  });

  it('reports the result of resending a verification email', async () => {
    api.sendVerificationEmail.and.returnValue(of({}));
    await page.resendVerificationEmail();
    expect(page.verificationMessage).toContain('email de vérification a été envoyé');
    api.sendVerificationEmail.and.returnValue(throwError(() => new Error('SMTP error')));
    await page.resendVerificationEmail();
    expect(page.verificationMessage).toBe('');
    expect(page.verificationError).toContain('Impossible d’envoyer');
  });

  it('does not submit invalid or loading login and password reset forms', async () => {
    page.email = 'invalid';
    page.password = 'password';
    await page.signInEmail();
    await page.sendPasswordReset();
    expect(auth.signInEmail).not.toHaveBeenCalled();
    expect(auth.requestPasswordReset).not.toHaveBeenCalled();

    page.email = 'user@example.com';
    page.loading = true;
    await page.signInEmail();
    await page.sendPasswordReset();
    expect(auth.signInEmail).not.toHaveBeenCalled();
    expect(auth.requestPasswordReset).not.toHaveBeenCalled();
  });
});
