import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ORDER_STATUSES, deleteOrder, readOrders, updateOrderStatus, type OrderStatus } from '../services/orders.store';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-orders.html',
})
export class AdminOrders {
  readonly orders = signal(readOrders());
  readonly statusFilter = signal<'all' | OrderStatus>('all');
  readonly statuses = ORDER_STATUSES;
  readonly notice = signal<string | null>(null);
  readonly deleteTargetId = signal<string | null>(null);
  readonly expandedId = signal<string | null>(null);

  readonly filtered = computed(() => {
    const f = this.statusFilter();
    if (f === 'all') return this.orders();
    return this.orders().filter((o) => o.status === f);
  });

  readonly revenue = computed(() => this.filtered().reduce((sum, o) => sum + o.total, 0));

  refresh(): void {
    this.orders.set(readOrders());
  }

  setStatus(id: string, status: OrderStatus): void {
    updateOrderStatus(id, status);
    this.refresh();
    this.flash(`Order ${id} marked as ${status}.`);
  }

  toggleExpand(id: string): void {
    this.expandedId.update((cur) => (cur === id ? null : id));
  }

  askDelete(id: string): void {
    this.deleteTargetId.set(id);
  }

  confirmDelete(): void {
    const id = this.deleteTargetId();
    if (id) {
      deleteOrder(id);
      this.refresh();
      this.flash(`Order ${id} deleted.`);
    }
    this.deleteTargetId.set(null);
  }

  private flash(msg: string): void {
    this.notice.set(msg);
    setTimeout(() => this.notice.set(null), 3000);
  }
}
