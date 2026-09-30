import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.html',
})
export class AdminUsers {
  private readonly auth = inject(AuthService);

  readonly users = signal(this.auth.getAllUsers());
  readonly searchFilter = signal('');
  readonly notice = signal<string | null>(null);
  readonly deleteTargetId = signal<string | null>(null);

  readonly filtered = computed(() => {
    const q = this.searchFilter().toLowerCase().trim();
    if (!q) return this.users();
    return this.users().filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  refresh(): void {
    this.users.set(this.auth.getAllUsers());
  }

  toggleRole(id: string, current: 'admin' | 'user'): void {
    const next = current === 'admin' ? 'user' : 'admin';
    if (!this.auth.setUserRole(id, next)) {
      this.flash('You cannot change your own role while logged in.');
      return;
    }
    this.flash(`Role updated to ${next}.`);
    this.refresh();
  }

  askDelete(id: string): void {
    this.deleteTargetId.set(id);
  }

  confirmDelete(): void {
    const id = this.deleteTargetId();
    if (id) {
      if (!this.auth.deleteUser(id)) {
        this.flash('You cannot delete your own account while logged in.');
      } else {
        this.flash('User deleted.');
      }
      this.refresh();
    }
    this.deleteTargetId.set(null);
  }

  private flash(msg: string): void {
    this.notice.set(msg);
    setTimeout(() => this.notice.set(null), 3000);
  }
}
