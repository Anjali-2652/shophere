import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Auth } from './auth/auth';
import { Checkout } from './checkout/checkout';
import { Account } from './account/account';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Public: anyone can browse the store without login.
  { path: '', component: Home },
  { path: 'login', component: Auth },
  { path: 'register', component: Auth },
  // Login-guarded extra features (real pages, not placeholders).
  { path: 'checkout', component: Checkout, canActivate: [authGuard] },
  { path: 'account', component: Account, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
