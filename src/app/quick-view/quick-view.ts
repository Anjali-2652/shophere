import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Product, ProductService } from '../services/product.service';

/** Global Quick View modal — opened from any product card on any route. */
@Component({
  selector: 'app-quick-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quick-view.html',
})
export class QuickView {
  readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  readonly modalQuantity = signal(1);

  close(): void {
    this.productService.closeQuickView();
    this.modalQuantity.set(1);
  }

  incrementQty(): void {
    this.modalQuantity.update((q) => q + 1);
  }

  decrementQty(): void {
    this.modalQuantity.update((q) => (q > 1 ? q - 1 : 1));
  }

  addToCartWithQuantity(product: Product): void {
    for (let i = 0; i < this.modalQuantity(); i++) {
      if (!this.productService.addToCart(product)) return;
    }
    this.modalQuantity.set(1);
    this.close();
  }

  toggleWishlist(product: Product): void {
    this.productService.toggleWishlist(product);
  }

  isInWishlist(id: number): boolean {
    return this.productService.isInWishlist(id);
  }

  /** Jump from the modal to the full routed details page. */
  openFullDetails(product: Product): void {
    this.close();
    this.router.navigate(['/product', product.id]);
  }

  formatOriginalPrice(price: number, discountPercentage: number): string {
    if (!discountPercentage || discountPercentage <= 0) return '';
    const orig = price / (1 - discountPercentage / 100);
    return `$${orig.toFixed(2)}`;
  }
}
