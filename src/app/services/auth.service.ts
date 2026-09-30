import { Injectable, computed, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

export type UserRole = 'admin' | 'user';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  role: UserRole;
}

/** Public user record for the admin panel (never includes the password hash). */
export interface AdminUserView {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  isCurrentSession: boolean;
}

interface StoredUser extends AuthUser {
  passwordHash: string;
}

interface SessionData {
  token: string;
  expiresAt: number;
  user: AuthUser;
}

const USERS_KEY = 'shopease_users';
const SESSION_KEY = 'shopease_auth_token';
const USER_KEY = 'shopease_auth_user';
const EXPIRY_KEY = 'shopease_auth_expires_at';

/** Default admin account seeded on first run (demo credentials). */
export const DEMO_ADMIN_EMAIL = 'admin@shopease.com';
export const DEMO_ADMIN_PASSWORD = 'admin123';

// Simple (non-secure, demo-only) hash — avoids storing plain passwords in localStorage.
function hashPassword(password: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < password.length; i++) {
    const ch = password.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

function makeToken(): string {
  const rand = Math.random().toString(36).slice(2) + Date.now().toString(36);
  // Fake JWT-like token: header.payload.signature (base64, demo only)
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: rand, iat: Date.now() }));
  const sig = btoa(rand).replace(/=/g, '');
  return `${header}.${payload}.${sig}`;
}

function defaultAvatar(name: string): string {
  const initial = (name.trim().charAt(0) || 'U').toUpperCase();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=0f3d3e&color=ffd166&bold=true`;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router, { optional: true });

  /** Currently logged-in user (null = guest). */
  readonly currentUser = signal<AuthUser | null>(null);
  readonly token = signal<string | null>(null);
  readonly authError = signal<string | null>(null);
  readonly isLoading = signal(false);

  readonly isLoggedIn = computed(() => !!this.currentUser() && !!this.token());

  /** True when the logged-in user is an admin. */
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  /** Where to send the user after a successful login (set by guard / gated actions). */
  readonly redirectUrl = signal<string | null>(null);

  constructor() {
    this.ensureSeedAdmin();
    this.restoreSession();
  }

  // ---------- Registration ----------

  register(name: string, email: string, password: string): boolean {
    this.authError.set(null);
    name = name.trim();
    email = email.trim().toLowerCase();

    if (!name || !email || !password) {
      this.authError.set('Please fill in all fields.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.authError.set('Please enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      this.authError.set('Password must be at least 6 characters.');
      return false;
    }

    const users = this.readUsers();
    if (users.some((u) => u.email === email)) {
      this.authError.set('An account with this email already exists. Please login.');
      return false;
    }

    const user: StoredUser = {
      id: `u_${Date.now().toString(36)}`,
      name,
      email,
      avatar: defaultAvatar(name),
      createdAt: new Date().toISOString(),
      role: 'user',
      passwordHash: hashPassword(password),
    };
    users.push(user);
    this.writeUsers(users);
    this.startSession(this.toAuthUser(user));
    return true;
  }

  // ---------- Login / Logout ----------

  login(email: string, password: string): boolean {
    this.authError.set(null);
    email = email.trim().toLowerCase();
    if (!email || !password) {
      this.authError.set('Please enter email and password.');
      return false;
    }
    const users = this.readUsers();
    const found = users.find((u) => u.email === email);
    if (!found || found.passwordHash !== hashPassword(password)) {
      this.authError.set('Invalid email or password.');
      return false;
    }
    this.startSession(this.toAuthUser(found));
    return true;
  }

  logout(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(EXPIRY_KEY);
    } catch { /* storage unavailable */ }
    this.currentUser.set(null);
    this.token.set(null);
    this.authError.set(null);
    this.redirectUrl.set(null);
    this.router?.navigate(['/']);
  }

  /** Token getter for interceptors / API calls. Returns null when expired. */
  getToken(): string | null {
    if (this.isSessionExpired()) {
      this.clearExpiredSession();
      return null;
    }
    return this.token();
  }

  /** True when a valid (non-expired) session exists. Call before cart/wishlist actions. */
  isAuthenticated(): boolean {
    if (this.isSessionExpired()) {
      this.clearExpiredSession();
      return false;
    }
    return !!this.token() && !!this.currentUser();
  }

  /**
   * Gate helper for "extra features" (cart / wishlist / checkout).
   * Returns true when logged in. When not, remembers the redirect,
   * navigates to /login and returns false.
   */
  requireLogin(returnUrl?: string): boolean {
    if (this.isAuthenticated()) return true;
    this.redirectUrl.set(returnUrl ?? this.router?.url ?? '/');
    this.router?.navigate(['/login'], { queryParams: { returnUrl: this.redirectUrl() } });
    return false;
  }

  /** Send user to remembered page (or '/') after login/register. */
  redirectAfterLogin(): void {
    const url = this.redirectUrl() ?? '/';
    this.redirectUrl.set(null);
    this.router?.navigateByUrl(url);
  }

  // ---------- Admin: user management (all data lives in localStorage) ----------

  /** All registered users (password hashes never leave the service). */
  getAllUsers(): AdminUserView[] {
    const currentId = this.currentUser()?.id;
    return this.readUsers().map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role ?? 'user',
      createdAt: u.createdAt,
      isCurrentSession: u.id === currentId,
    }));
  }

  /**
   * Change a user's role. Returns false when refused
   * (target missing, or trying to change your own role while logged in).
   */
  setUserRole(id: string, role: UserRole): boolean {
    if (id === this.currentUser()?.id) return false;
    const users = this.readUsers();
    const found = users.find((u) => u.id === id);
    if (!found) return false;
    found.role = role;
    this.writeUsers(users);
    return true;
  }

  /**
   * Delete a user account. Returns false when refused
   * (target missing, or trying to delete your own logged-in account).
   */
  deleteUser(id: string): boolean {
    if (id === this.currentUser()?.id) return false;
    const users = this.readUsers();
    if (!users.some((u) => u.id === id)) return false;
    this.writeUsers(users.filter((u) => u.id !== id));
    return true;
  }

  // ---------- Session internals ----------

  /** Token lifetime: 7 days (sliding not implemented — re-login after expiry). */
  private readonly SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  private startSession(user: AuthUser): void {
    const session: SessionData = {
      token: makeToken(),
      expiresAt: Date.now() + this.SESSION_TTL_MS,
      user,
    };
    try {
      localStorage.setItem(SESSION_KEY, session.token);
      localStorage.setItem(USER_KEY, JSON.stringify(session.user));
      localStorage.setItem(EXPIRY_KEY, String(session.expiresAt));
    } catch { /* storage unavailable (private mode) */ }
    this.token.set(session.token);
    this.currentUser.set(session.user);
  }

  private restoreSession(): void {
    try {
      const token = localStorage.getItem(SESSION_KEY);
      const rawUser = localStorage.getItem(USER_KEY);
      const rawExp = localStorage.getItem(EXPIRY_KEY);
      if (!token || !rawUser || !rawExp) return;
      if (Number(rawExp) <= Date.now()) {
        this.clearExpiredSession();
        return;
      }
      const parsed = JSON.parse(rawUser) as AuthUser;
      // Backfill role for sessions saved before roles existed.
      if (!parsed.role) parsed.role = 'user';
      this.token.set(token);
      this.currentUser.set(parsed);
    } catch {
      return;
    }
  }

  private isSessionExpired(): boolean {
    try {
      const rawExp = localStorage.getItem(EXPIRY_KEY);
      if (!rawExp) return !this.token() ? false : true;
      return Number(rawExp) <= Date.now();
    } catch {
      return false;
    }
  }

  private clearExpiredSession(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(EXPIRY_KEY);
    } catch { /* ignore */ }
    this.token.set(null);
    this.currentUser.set(null);
  }

  private readUsers(): StoredUser[] {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Backfill role for accounts created before roles existed.
      return (parsed as StoredUser[]).map((u) => ({ ...u, role: u.role ?? 'user' }));
    } catch {
      return [];
    }
  }

  private writeUsers(users: StoredUser[]): void {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch { /* ignore */ }
  }

  private toAuthUser(u: StoredUser): AuthUser {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      createdAt: u.createdAt,
      role: u.role ?? 'user',
    };
  }

  /** Seeds the default admin account on first run (demo credentials). */
  private ensureSeedAdmin(): void {
    const users = this.readUsers();
    if (users.some((u) => u.email === DEMO_ADMIN_EMAIL)) return;
    users.push({
      id: 'u_admin_seed',
      name: 'Store Admin',
      email: DEMO_ADMIN_EMAIL,
      avatar: defaultAvatar('Store Admin'),
      createdAt: new Date().toISOString(),
      role: 'admin',
      passwordHash: hashPassword(DEMO_ADMIN_PASSWORD),
    });
    this.writeUsers(users);
  }
}
