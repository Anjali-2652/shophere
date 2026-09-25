import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductCategory, ProductService } from '../services/product.service';

export interface FeaturedCategory {
  id: string;
  name: string;
  slug: string;
  image: string;
  itemCount: string;
  bgGradient: string;
  badge?: string;
}

@Component({
  selector: 'app-shop-by-category',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shop-by-category.html',
  styleUrl: './shop-by-category.css',
})
export class ShopByCategory {
  readonly productService = inject(ProductService);

  // View all modal state
  readonly isViewAllOpen = signal(false);
  readonly allCategoriesFilter = signal('');

  // Primary 6 Featured Categories matching UI Mockup Screen 1
  readonly featuredCategories: FeaturedCategory[] = [
    {
      id: 'electronics',
      name: 'Electronics',
      slug: 'laptops',
      image: 'https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/thumbnail.webp',
      itemCount: '24+ Products',
      bgGradient: 'from-sky-50 via-indigo-50/40 to-slate-50',
      badge: 'Popular',
    },
    {
      id: 'fashion',
      name: 'Fashion',
      slug: 'mens-shirts',
      image: 'https://cdn.dummyjson.com/product-images/mens-shirts/blue-&-black-check-shirt/thumbnail.webp',
      itemCount: '35+ Products',
      bgGradient: 'from-amber-50 via-orange-50/30 to-slate-50',
    },
    {
      id: 'home-living',
      name: 'Home & Living',
      slug: 'furniture',
      image: 'https://cdn.dummyjson.com/product-images/furniture/annibale-colombo-bed/thumbnail.webp',
      itemCount: '18+ Products',
      bgGradient: 'from-stone-50 via-amber-50/20 to-slate-50',
    },
    {
      id: 'beauty-health',
      name: 'Beauty & Health',
      slug: 'beauty',
      image: 'https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/thumbnail.webp',
      itemCount: '42+ Products',
      bgGradient: 'from-rose-50 via-pink-50/30 to-slate-50',
      badge: 'Trending',
    },
    {
      id: 'sports-outdoors',
      name: 'Sports & Outdoors',
      slug: 'mens-shoes',
      image: 'https://cdn.dummyjson.com/product-images/mens-shoes/nike-air-jordan-1-red-and-black/thumbnail.webp',
      itemCount: '29+ Products',
      bgGradient: 'from-emerald-50 via-teal-50/30 to-slate-50',
    },
    {
      id: 'fragrances',
      name: 'Fragrances',
      slug: 'fragrances',
      image: 'https://cdn.dummyjson.com/product-images/fragrances/calvin-klein-ck-one/thumbnail.webp',
      itemCount: '15+ Products',
      bgGradient: 'from-purple-50 via-indigo-50/30 to-slate-50',
      badge: 'Luxury',
    },
  ];

  // Filtered categories for the "View All" modal
  readonly filteredCategories = computed(() => {
    const query = this.allCategoriesFilter().toLowerCase().trim();
    const categories = this.productService.categories();
    if (!query) return categories;
    return categories.filter(
      (cat) => cat.name.toLowerCase().includes(query) || cat.slug.toLowerCase().includes(query)
    );
  });

  // Selected category in ProductService
  readonly selectedCategory = this.productService.selectedCategory;

  selectCategory(slug: string): void {
    if (this.selectedCategory() === slug) {
      this.productService.selectCategory(null);
    } else {
      this.productService.selectCategory(slug);
    }
    this.isViewAllOpen.set(false);
    // Bring the filtered grid into view so the selection visibly does something.
    setTimeout(() => {
      document
        .getElementById('featured-products')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  toggleViewAll(): void {
    this.isViewAllOpen.update((v) => !v);
  }

  closeViewAll(): void {
    this.isViewAllOpen.set(false);
  }

  formatSlug(slug: string): string {
    return slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
