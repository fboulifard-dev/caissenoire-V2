import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { AuthService } from './services/auth.service';
import { environment } from '../environments/environment';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let title: jasmine.SpyObj<Title>;

  beforeEach(async () => {
    title = jasmine.createSpyObj<Title>('Title', ['getTitle', 'setTitle']);
    title.getTitle.and.returnValue('ASPTT Caisse noire');
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: Title, useValue: title },
        { provide: AuthService, useValue: {} },
        { provide: Router, useValue: { url: '/login' } },
        { provide: NavController, useValue: {} }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('prefixes the browser title for development and recette, but not production', () => {
    const original = environment.titlePrefix;
    try {
      environment.titlePrefix = 'DEV';
      TestBed.createComponent(AppComponent);
      expect(title.setTitle).toHaveBeenCalledOnceWith('DEV ASPTT Caisse noire');
      title.setTitle.calls.reset();

      environment.titlePrefix = 'REC';
      TestBed.createComponent(AppComponent);
      expect(title.setTitle).toHaveBeenCalledOnceWith('REC ASPTT Caisse noire');
      title.setTitle.calls.reset();

      environment.titlePrefix = '';
      TestBed.createComponent(AppComponent);
      expect(title.setTitle).not.toHaveBeenCalled();
    } finally {
      environment.titlePrefix = original;
    }
  });
});
