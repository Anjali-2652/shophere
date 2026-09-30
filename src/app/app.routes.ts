import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Auth } from './auth/auth';
import { Checkout } from './checkout/checkout';
import { Account } from './account/account';
import { Catalog } from './catalog/catalog';
import { ProductDetails } from './product-details/product-details';
import { Admin } from './admin/admin';
import { AdminDashboard } from './admin/admin-dashboard';
import { AdminProducts } from './admin/admin-products';
import { AdminUsers } from './admin/admin-users';
import { AdminOrders } from './admin/admin-orders';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  // Public: anyone can browse the store without login.
  { path: '', component: Home },
  { path: 'login', component: Auth },
  { path: 'register', component: Auth },
  // Product details with id in the URL: /product/1
  { path: 'product/:id', component: ProductDetails },
  // Category listing: /category/beauty
  { path: 'category/:slug', component: Catalog },
  // Ranked shop views (backed by real API fields)
  { path: 'deals', component: Catalog, data: { view: 'deals' } },
  { path: 'new-arrivals', component: Catalog, data: { view: 'new' } },
  { path: 'best-sellers', component: Catalog, data: { view: 'top' } },
  // Login-guarded extra features (real pages, not placeholders).
  { path: 'checkout', component: Checkout, canActivate: [authGuard] },
  { path: 'account', component: Account, canActivate: [authGuard] },
  // Admin panel (admin role only) with section sub-routes.
  {
    path: 'admin',
    component: Admin,
    canActivate: [adminGuard],
    children: [
      { path: '', component: AdminDashboard },
      { path: 'products', component: AdminProducts },
      { path: 'users', component: AdminUsers },
      { path: 'orders', component: AdminOrders },
    ],
  },
  { path: '**', redirectTo: '' },
];
