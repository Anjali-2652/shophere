import { TestBed } from '@angular/core/testing';

import { AuthService, DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD } from './auth.service';

describe('AuthService roles & admin', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('should seed the demo admin on first run', () => {
    const users = service.getAllUsers();
    const admin = users.find((u) => u.email === DEMO_ADMIN_EMAIL);
    expect(admin).toBeTruthy();
    expect(admin?.role).toBe('admin');
  });

  it('should login the seeded admin with the demo password', () => {
    expect(service.login(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD)).toBe(true);
    expect(service.isAdmin()).toBe(true);
  });

  it('should register new accounts as plain users', () => {
    expect(service.register('Jane', 'jane@example.com', 'secret12')).toBe(true);
    expect(service.currentUser()?.role).toBe('user');
    expect(service.isAdmin()).toBe(false);
  });

  it('should let an admin promote and demote other users', () => {
    service.register('Bob', 'bob@example.com', 'secret12');
    const bob = service.getAllUsers().find((u) => u.email === 'bob@example.com')!;
    service.logout();
    service.login(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);
    expect(service.setUserRole(bob.id, 'admin')).toBe(true);
    expect(service.getAllUsers().find((u) => u.id === bob.id)?.role).toBe('admin');
    expect(service.setUserRole(bob.id, 'user')).toBe(true);
  });

  it('should refuse to change or delete your own account', () => {
    service.login(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);
    const me = service.currentUser()!;
    expect(service.setUserRole(me.id, 'user')).toBe(false);
    expect(service.deleteUser(me.id)).toBe(false);
    expect(service.getAllUsers().some((u) => u.id === me.id)).toBe(true);
  });

  it('should delete other users', () => {
    service.register('Temp', 'temp@example.com', 'secret12');
    const temp = service.getAllUsers().find((u) => u.email === 'temp@example.com')!;
    service.logout();
    service.login(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);
    expect(service.deleteUser(temp.id)).toBe(true);
    expect(service.getAllUsers().some((u) => u.id === temp.id)).toBe(false);
  });
});
