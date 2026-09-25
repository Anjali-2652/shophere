import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class Auth {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly mode = signal<AuthMode>('login');
  readonly name = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly showPassword = signal(false);
  readonly isSubmitting = signal(false);
  readonly notice = signal<string | null>(null);

  readonly auth = this.authService;
  private returnUrl = '/';

  constructor() {
    const qp = this.route.snapshot.queryParamMap;
    this.returnUrl = qp.get('returnUrl') || '/';
    this.authService.redirectUrl.set(this.returnUrl === '/login' ? '/' : this.returnUrl);
    // Deep-link support: /register opens in register mode.
    if (this.router.url.startsWith('/register')) this.mode.set('register');
    // Already logged in → bounce to home (or returnUrl).
    if (this.authService.isAuthenticated()) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.authService.authError.set(null);
    this.notice.set(null);
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.authService.authError.set(null);

    let ok = false;
    if (this.mode() === 'register') {
      ok = this.authService.register(this.name(), this.email(), this.password());
    } else {
      ok = this.authService.login(this.email(), this.password());
    }
    this.isSubmitting.set(false);

    if (!ok) return;

    if (this.mode() === 'register') {
      this.notice.set(`Welcome, ${this.authService.currentUser()?.name}! Your account was created.`);
    }
    // Small delay so the welcome state is visible, then redirect back.
    setTimeout(() => this.authService.redirectAfterLogin(), 450);
  }

  fillDemo(): void {
    // One-click demo: creates the demo account if missing, then logs in.
    const demoEmail = 'demo@shopease.com';
    const demoPass = 'demo1234';
    if (!this.authService.login(demoEmail, demoPass)) {
      this.authService.register('Demo User', demoEmail, demoPass);
    }
    if (this.authService.isAuthenticated()) {
      this.authService.redirectAfterLogin();
    }
  }
}
