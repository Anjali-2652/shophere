import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ProductService } from '../services/product.service';
import { readOrders } from '../services/orders.store';
import { deleteSubscriber, readSubscribers } from '../services/newsletter.store';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboard {
  private readonly auth = inject(AuthService);
  private readonly productService = inject(ProductService);

  readonly users = signal(this.auth.getAllUsers());
  readonly orders = signal(readOrders());
  readonly subscribers = signal(readSubscribers());
  readonly liveTotal = signal<number | null>(null);
  readonly customCount = computed(() => this.productService.customProducts().length);

  readonly adminCount = computed(() => this.users().filter((u) => u.role === 'admin').length);
  readonly revenue = computed(() => this.orders().reduce((sum, o) => sum + o.total, 0));
  readonly pendingOrders = computed(() => this.orders().filter((o) => o.status === 'Pending').length);
  readonly recentOrders = computed(() => this.orders().slice(0, 5));

  constructor() {
    // Live catalog size for the "Products" stat (cheap: limit=1 returns total).
    this.productService.getProductPool(1).subscribe({
      next: (res) => this.liveTotal.set(res.total ?? 0),
      error: () => this.liveTotal.set(null),
    });
  }

  refresh(): void {
    this.users.set(this.auth.getAllUsers());
    this.orders.set(readOrders());
    this.subscribers.set(readSubscribers());
  }

  removeSubscriber(email: string): void {
    deleteSubscriber(email);
    this.subscribers.set(readSubscribers());
  }
}
