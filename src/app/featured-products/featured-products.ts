import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, ProductService } from '../services/product.service';

@Component({
  selector: 'app-featured-products',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './featured-products.html',
  styleUrl: './featured-products.css',
})
export class FeaturedProducts {
  readonly productService = inject(ProductService);

  // Active filter tab
  readonly activeTab = signal<string>('all');

  // Filter tabs matching key catalog segments
  readonly filterTabs = [
    { label: 'All Products', slug: 'all' },
    { label: 'Electronics', slug: 'laptops' },
    { label: 'Fashion & Shoes', slug: 'mens-shoes' },
    { label: 'Beauty & Skincare', slug: 'beauty' },
    { label: 'Fragrances', slug: 'fragrances' },
    { label: 'Home & Furniture', slug: 'furniture' },
  ];

  // Added to cart feedback toast
  readonly addedToast = signal<string | null>(null);

  // Quick view modal quantity
  readonly modalQuantity = signal(1);

  onTabClick(slug: string): void {
    this.activeTab.set(slug);
    if (slug === 'all') {
      this.productService.clearShopFilter();
    } else {
      this.productService.selectCategory(slug);
    }
  }

  /** Clears Deals / New / Top banner back to the default grid. */
  clearShopView(): void {
    this.activeTab.set('all');
    this.productService.clearShopFilter();
  }

  retryLoad(): void {
    this.productService.loadFeaturedProducts(
      this.productService.selectedCategory(),
      this.productService.shopSort() === 'default' &&
        !this.productService.selectedCategory() ? 8 : 30
    );
  }

  addToCart(product: Product, event?: Event): void {
    if (event) event.stopPropagation();
    const added = this.productService.addToCart(product);
    if (added) this.showAddedToast(product.title);
  }

  addToCartWithQuantity(product: Product): void {
    for (let i = 0; i < this.modalQuantity(); i++) {
      if (!this.productService.addToCart(product)) return;
    }
    this.showAddedToast(`${this.modalQuantity()}x "${product.title}" added to cart`);
    this.modalQuantity.set(1);
    this.closeQuickView();
  }

  toggleWishlist(product: Product, event?: Event): void {
    if (event) event.stopPropagation();
    this.productService.toggleWishlist(product);
  }

  isInWishlist(id: number): boolean {
    return this.productService.isInWishlist(id);
  }

  openQuickView(product: Product, event?: Event): void {
    if (event) event.stopPropagation();
    this.modalQuantity.set(1);
    this.productService.openQuickView(product);
  }

  closeQuickView(): void {
    this.productService.closeQuickView();
  }

  incrementModalQty(): void {
    this.modalQuantity.update((q) => q + 1);
  }

  decrementModalQty(): void {
    this.modalQuantity.update((q) => (q > 1 ? q - 1 : 1));
  }

  private showAddedToast(title: string): void {
    this.addedToast.set(`Added "${title}" to your cart`);
    setTimeout(() => {
      this.addedToast.set(null);
    }, 2800);
  }

  formatOriginalPrice(price: number, discountPercentage: number): string {
    if (!discountPercentage || discountPercentage <= 0) return '';
    const orig = price / (1 - discountPercentage / 100);
    return `$${orig.toFixed(2)}`;
  }
}
