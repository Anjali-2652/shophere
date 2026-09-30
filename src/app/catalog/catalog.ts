import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product, ProductService } from '../services/product.service';
import { ProductCard } from '../product-card/product-card';

export type CatalogView = 'deals' | 'new' | 'top';

/**
 * Routed catalog page.
 * - /category/:slug → all products of a category (slug input)
 * - /deals, /new-arrivals, /best-sellers → ranked views (view input via route data)
 */
@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCard],
  templateUrl: './catalog.html',
})
export class Catalog {
  readonly slug = input<string>();
  readonly view = input<CatalogView>();

  private readonly productService = inject(ProductService);

  readonly products = signal<Product[]>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly addedToast = signal<string | null>(null);

  readonly isCategoryMode = computed(() => !!this.slug());

  readonly title = computed(() => {
    const view = this.view();
    if (view === 'deals') return 'Deals';
    if (view === 'new') return 'New Arrivals';
    if (view === 'top') return 'Best Sellers';
    const slug = this.slug() ?? '';
    const found = this.productService.categories().find((c) => c.slug === slug);
    return found ? found.name : this.formatSlug(slug);
  });

  readonly subtitle = computed(() => {
    switch (this.view()) {
      case 'deals': return 'Biggest discounts across the live catalog';
      case 'new': return 'Latest additions, newest first';
      case 'top': return 'Top rated customer favourites';
      default: return `${this.products().length} products in this category`;
    }
  });

  constructor() {
    effect(() => {
      this.load(this.slug(), this.view());
    });
  }

  load(slug: string | undefined, view: CatalogView | undefined): void {
    this.isLoading.set(true);
    this.error.set(null);
    if (slug) {
      this.productService.getCategoryProducts(slug, 24).subscribe({
        next: (res) => {
          this.products.set(res.products ?? []);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('Failed to load this category. Please try again.');
          this.isLoading.set(false);
        },
      });
      return;
    }
    // Ranked views: one pool fetch, ranked client-side from real API fields.
    this.productService.getProductPool(60).subscribe({
      next: (res) => {
        const list = [...(res.products ?? [])];
        if (view === 'deals') {
          list.sort((a, b) => b.discountPercentage - a.discountPercentage);
        } else if (view === 'new') {
          list.sort((a, b) => +new Date(b.meta?.createdAt ?? 0) - +new Date(a.meta?.createdAt ?? 0));
        } else {
          list.sort((a, b) => b.rating - a.rating);
        }
        this.products.set(list.slice(0, 24));
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load products. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  retry(): void {
    this.load(this.slug(), this.view());
  }

  onCardAdded(product: Product): void {
    this.addedToast.set(`Added "${product.title}" to your cart`);
    setTimeout(() => this.addedToast.set(null), 2800);
  }

  private formatSlug(slug: string): string {
    return slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
