import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Blocks protected routes for guests.
 * Browsing the store is public — only "extra features"
 * (cart checkout, account pages, …) go behind this guard.
 * Remembers the attempted URL so login can redirect back.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  auth.redirectUrl.set(state.url);
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
