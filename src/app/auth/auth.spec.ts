import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

import { Auth } from './auth';

describe('Auth', () => {
  let component: Auth;
  let fixture: ComponentFixture<Auth>;

  const routerStub = {
    url: '/login',
    navigate: () => Promise.resolve(true),
    navigateByUrl: () => Promise.resolve(true),
  };
  const activatedRouteStub = {
    snapshot: { queryParamMap: { get: () => null } },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Auth],
      providers: [
        { provide: Router, useValue: routerStub },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Auth);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start in login mode', () => {
    expect(component.mode()).toBe('login');
  });

  it('should switch modes', () => {
    component.setMode('register');
    expect(component.mode()).toBe('register');
  });
});
