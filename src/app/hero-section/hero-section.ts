import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-hero-section',
  imports: [],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.css',
})
export class HeroSection {
  private readonly router = inject(Router);

  /** Shop Now → real product grid (was a dead #explore anchor). */
  shopNow(): void {
    this.scrollToId('featured-products');
  }

  /** Explore Deals → routed deals page (was a dead #deals anchor). */
  exploreDeals(): void {
    this.router.navigate(['/deals']);
  }

  private scrollToId(id: string): void {
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }
}
