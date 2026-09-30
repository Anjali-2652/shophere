import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, ProductService } from '../services/product.service';
import { ProductCard } from '../product-card/product-card';

@Component({
  selector: 'app-featured-products',
  standalone: true,
  imports: [CommonModule, ProductCard],
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

  onTabClick(slug: string): void {
    this.activeTab.set(slug);
    this.productService.selectCategory(slug === 'all' ? null : slug);
  }

  onCardAdded(product: Product): void {
    this.addedToast.set(`Added "${product.title}" to your cart`);
    setTimeout(() => {
      this.addedToast.set(null);
    }, 2800);
  }

  clearFilter(): void {
    this.activeTab.set('all');
    this.productService.selectCategory(null);
  }

  retryLoad(): void {
    this.productService.loadFeaturedProducts(this.productService.selectedCategory());
  }
}
