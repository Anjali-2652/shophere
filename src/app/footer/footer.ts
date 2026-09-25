import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  readonly productService = inject(ProductService);
  private readonly router = inject(Router);
  readonly currentYear = new Date().getFullYear();

  selectCategory(slug: string): void {
    this.productService.selectCategory(slug);
    this.scrollToId('featured-products');
  }

  /** Deals footer link — real discounted-products view (was a dead #deals anchor). */
  showDeals(): void {
    this.productService.showDeals();
    this.scrollToId('featured-products');
  }

  private scrollToId(id: string): void {
    if (this.router.url !== '/') {
      this.router.navigate(['/']).then(() =>
        setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 80)
      );
    } else {
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
