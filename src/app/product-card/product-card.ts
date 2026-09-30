import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Product, ProductService } from '../services/product.service';

/**
 * Shared product card — clicking the card opens /product/:id.
 * Used by the home grid, catalog pages and related-products rows.
 */
@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.html',
})
export class ProductCard {
  readonly product = input.required<Product>();
  /** Emitted when Add succeeds (parent shows its toast). */
  readonly added = output<Product>();

  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  openDetails(): void {
    this.router.navigate(['/product', this.product().id]);
  }

  openQuickView(event?: Event): void {
    if (event) event.stopPropagation();
    this.productService.openQuickView(this.product());
  }

  addToCart(event?: Event): void {
    if (event) event.stopPropagation();
    if (this.productService.addToCart(this.product())) {
      this.added.emit(this.product());
    }
  }

  toggleWishlist(event?: Event): void {
    if (event) event.stopPropagation();
    this.productService.toggleWishlist(this.product());
  }

  isInWishlist(): boolean {
    return this.productService.isInWishlist(this.product().id);
  }

  formatOriginalPrice(price: number, discountPercentage: number): string {
    if (!discountPercentage || discountPercentage <= 0) return '';
    const orig = price / (1 - discountPercentage / 100);
    return `$${orig.toFixed(2)}`;
  }
}
