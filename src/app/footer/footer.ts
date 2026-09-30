import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  private readonly router = inject(Router);
  readonly currentYear = new Date().getFullYear();

  selectCategory(slug: string): void {
    // Dedicated routed page: /category/:slug
    this.router.navigate(['/category', slug]);
  }

  /** Deals footer link — routed page (was a dead #deals anchor). */
  showDeals(): void {
    this.router.navigate(['/deals']);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
