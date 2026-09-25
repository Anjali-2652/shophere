import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-hero-section',
  imports: [],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.css',
})
export class HeroSection {
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);

  /** Shop Now → real product grid (was a dead #explore anchor). */
  shopNow(): void {
    this.scrollToId('featured-products');
  }

  /** Explore Deals → real discounted-products view (was a dead #deals anchor). */
  exploreDeals(): void {
    this.productService.showDeals();
    if (this.router.url !== '/') {
      this.router.navigate(['/']).then(() => this.scrollToId('featured-products'));
    } else {
      this.scrollToId('featured-products');
    }
  }

  private scrollToId(id: string): void {
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }
}
