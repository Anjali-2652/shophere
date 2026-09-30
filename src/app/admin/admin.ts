import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin.html',
})
export class Admin {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly nav = [
    { label: 'Dashboard', path: '/admin', exact: true },
    { label: 'Products', path: '/admin/products', exact: false },
    { label: 'Users', path: '/admin/users', exact: false },
    { label: 'Orders', path: '/admin/orders', exact: false },
  ];

  viewStore(): void {
    this.router.navigate(['/']);
  }

  logout(): void {
    this.auth.logout();
  }
}
