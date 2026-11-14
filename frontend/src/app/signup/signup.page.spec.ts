import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { User } from 'firebase/auth';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { SignupPage } from './signup.page';

describe('SignupPage verification email', () => {
  let page: SignupPage;
  let auth: jasmine.SpyObj<AuthService>;
  let api: jasmine.SpyObj<ApiService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isLoggedIn', 'createAccount']);
    auth.isLoggedIn.and.returnValue(false);
    auth.createAccount.and.resolveTo({
      user: jasmine.createSpyObj<User>('User', ['getIdToken']),
      providerId: null,
      operationType: 'signIn'
    });
    api = jasmine.createSpyObj<ApiService>('ApiService', ['sendVerificationEmail']);
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
  });

  it('sends the verification email after creating the account', async () => {
    api.sendVerificationEmail.and.returnValue(of({}));
    spyOn(window, 'alert');
    await page.createAccount();
    expect(api.sendVerificationEmail).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('explains that the account exists when email delivery fails', async () => {
    api.sendVerificationEmail.and.returnValue(throwError(() => new Error('SMTP failed')));
    await page.createAccount();
    expect(page.error).toContain('compte a été créé');
    expect(page.error).toContain('nouvel envoi');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
