import { Component, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Product, ProductService } from '../services/product.service';
import { ProductCard } from '../product-card/product-card';

/** Routed details page: /product/:id */
@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCard],
  templateUrl: './product-details.html',
})
export class ProductDetails {
  /** Bound from the :id route param (withComponentInputBinding). */
  readonly id = input.required<string>();

  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  readonly product = signal<Product | null>(null);
  readonly related = signal<Product[]>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selectedImage = signal<string | null>(null);
  readonly quantity = signal(1);
  readonly addedNote = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.load(this.id());
    });
  }

  load(id: string): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.product.set(null);
    this.related.set([]);
    this.quantity.set(1);
    this.productService.getProduct(id).subscribe({
      next: (p) => {
        this.product.set(p);
        this.selectedImage.set(p.thumbnail);
        this.isLoading.set(false);
        this.loadRelated(p);
      },
      error: () => {
        this.error.set('This product could not be found. It may have been removed.');
        this.isLoading.set(false);
      },
    });
  }

  private loadRelated(p: Product): void {
    this.productService.getCategoryProducts(p.category, 5).subscribe({
      next: (res) => {
        this.related.set((res.products ?? []).filter((r) => r.id !== p.id).slice(0, 4));
      },
      error: () => this.related.set([]),
    });
  }

  retry(): void {
    this.load(this.id());
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  selectImage(src: string): void {
    this.selectedImage.set(src);
  }

  incrementQty(): void {
    this.quantity.update((q) => Math.min(q + 1, this.product()?.stock ?? 99));
  }

  decrementQty(): void {
    this.quantity.update((q) => (q > 1 ? q - 1 : 1));
  }

  addToCart(): void {
    const p = this.product();
    if (!p) return;
    for (let i = 0; i < this.quantity(); i++) {
      if (!this.productService.addToCart(p)) return;
    }
    this.addedNote.set(`${this.quantity()}x "${p.title}" added to your cart`);
    this.quantity.set(1);
    setTimeout(() => this.addedNote.set(null), 3000);
  }

  toggleWishlist(): void {
    const p = this.product();
    if (p) this.productService.toggleWishlist(p);
  }

  isInWishlist(): boolean {
    const p = this.product();
    return p ? this.productService.isInWishlist(p.id) : false;
  }

  onRelatedAdded(product: Product): void {
    this.addedNote.set(`Added "${product.title}" to your cart`);
    setTimeout(() => this.addedNote.set(null), 3000);
  }

  formatOriginalPrice(price: number, discountPercentage: number): string {
    if (!discountPercentage || discountPercentage <= 0) return '';
    return `$${(price / (1 - discountPercentage / 100)).toFixed(2)}`;
  }
}
