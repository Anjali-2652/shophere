import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ProductService } from '../services/product.service';
import { readOrders } from '../services/orders.store';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './account.html',
})
export class Account {
  readonly auth = inject(AuthService);
  readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  private readonly allOrders = signal(readOrders());

  /** Orders placed by the currently logged-in user. */
  readonly myOrders = computed(() => {
    const email = this.auth.currentUser()?.email?.toLowerCase();
    if (!email) return [];
    return this.allOrders().filter((o) => o.email.toLowerCase() === email);
  });

  /** Human-readable token expiry (null when unavailable). */
  get tokenExpiresAt(): string | null {
    try {
      const raw = localStorage.getItem('shopease_auth_expires_at');
      if (!raw) return null;
      return new Date(Number(raw)).toLocaleString();
    } catch {
      return null;
    }
  }

  refreshOrders(): void {
    this.allOrders.set(readOrders());
  }

  logout(): void {
    this.auth.logout();
  }

  browse(): void {
    this.productService.clearShopFilter();
    this.router.navigate(['/']);
  }
}
