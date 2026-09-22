import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product, ProductCategory, ProductService } from '../services/product.service';

export interface CategoryGroup {
  name: string;
  icon: string;
  slugs: string[];
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  readonly productService = inject(ProductService);

  // Navigation & Drawer States
  readonly isMobileMenuOpen = signal(false);
  readonly isCategoriesDropdownOpen = signal(false);
  readonly isUserMenuOpen = signal(false);
  readonly isCartDrawerOpen = signal(false);
  readonly isWishlistDrawerOpen = signal(false);
  readonly isMobileCategoriesExpanded = signal(false);

  // Search state
  readonly isSearchFocused = signal(false);
  readonly addedNotification = signal<string | null>(null);

  // Active navigation link
  readonly activeNav = signal<string>('Home');

  // Curated category departments mapped to DummyJSON slugs
  readonly categoryGroups: CategoryGroup[] = [
    {
      name: 'Electronics & Tech',
      icon: 'laptop',
      slugs: ['laptops', 'smartphones', 'tablets', 'mobile-accessories'],
    },
    {
      name: 'Fashion & Apparel',
      icon: 'shirt',
      slugs: ['mens-shirts', 'mens-shoes', 'mens-watches', 'womens-dresses', 'womens-shoes', 'womens-watches', 'womens-bags', 'womens-jewellery', 'tops', 'sunglasses'],
    },
    {
      name: 'Beauty & Wellness',
      icon: 'sparkles',
      slugs: ['beauty', 'fragrances', 'skin-care'],
    },
    {
      name: 'Home & Living',
      icon: 'armchair',
      slugs: ['furniture', 'home-decoration', 'kitchen-accessories', 'groceries'],
    },
    {
      name: 'Sports & Motors',
      icon: 'activity',
      slugs: ['sports-accessories', 'motorcycle', 'vehicle'],
    },
  ];

  // Nav Links matching mockups
  readonly navLinks = [
    { label: 'Home', hasDropdown: false },
    { label: 'Categories', hasDropdown: true },
    { label: 'Deals', hasDropdown: false, badge: 'HOT' },
    { label: 'New Arrivals', hasDropdown: false },
    { label: 'Best Sellers', hasDropdown: false },
  ];

  // Search trending recommendations from DummyJSON
  readonly trendingSearches = [
    'Mascara',
    'Perfume',
    'MacBook',
    'Sneakers',
    'Sunglasses',
    'Lipstick',
    'Watch',
  ];

  // User Profile information matching dashboard mockup
  readonly currentUser = {
    name: 'Anjali Gupta',
    email: 'anjali@example.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
  };

  // Promo code
  readonly promoCode = signal('');
  readonly promoApplied = signal(false);

  // Helper to format category slug into nice human title
  formatSlug(slug: string): string {
    return slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  // Toggle Methods
  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((v) => !v);
    if (this.isMobileMenuOpen()) {
      this.closeOtherMenus(['mobile']);
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  toggleCategoriesDropdown(): void {
    this.isCategoriesDropdownOpen.update((v) => !v);
    if (this.isCategoriesDropdownOpen()) {
      this.closeOtherMenus(['categories']);
    }
  }

  closeCategoriesDropdown(): void {
    this.isCategoriesDropdownOpen.set(false);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update((v) => !v);
    if (this.isUserMenuOpen()) {
      this.closeOtherMenus(['user']);
    }
  }

  closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  toggleCartDrawer(): void {
    this.isCartDrawerOpen.update((v) => !v);
    if (this.isCartDrawerOpen()) {
      this.closeOtherMenus(['cart']);
    }
  }

  closeCartDrawer(): void {
    this.isCartDrawerOpen.set(false);
  }

  toggleWishlistDrawer(): void {
    this.isWishlistDrawerOpen.update((v) => !v);
    if (this.isWishlistDrawerOpen()) {
      this.closeOtherMenus(['wishlist']);
    }
  }

  closeWishlistDrawer(): void {
    this.isWishlistDrawerOpen.set(false);
  }

  toggleMobileCategories(): void {
    this.isMobileCategoriesExpanded.update((v) => !v);
  }

  setActiveNav(link: string): void {
    this.activeNav.set(link);
    if (link === 'Categories') {
      this.toggleCategoriesDropdown();
    } else {
      this.closeCategoriesDropdown();
    }
  }

  // Search actions
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.productService.setSearchQuery(value);
  }

  selectTrendingSearch(term: string): void {
    this.productService.setSearchQuery(term);
    this.isSearchFocused.set(false);
  }

  clearSearch(): void {
    this.productService.clearSearch();
  }

  onSelectCategory(slug: string): void {
    this.productService.selectCategory(slug);
    this.closeCategoriesDropdown();
    this.closeMobileMenu();
    this.isSearchFocused.set(false);
  }

  // Cart operations via service
  addToCart(product: Product, event?: Event): void {
    if (event) event.stopPropagation();
    this.productService.addToCart(product);
    this.showAddedNotification(product.title);
  }

  incrementQuantity(id: number): void {
    this.productService.updateQuantity(id, 1);
  }

  decrementQuantity(id: number): void {
    this.productService.updateQuantity(id, -1);
  }

  removeItem(id: number): void {
    this.productService.removeFromCart(id);
  }

  // Wishlist actions via service
  toggleWishlist(product: Product, event?: Event): void {
    if (event) event.stopPropagation();
    this.productService.toggleWishlist(product);
  }

  isInWishlist(id: number): boolean {
    return this.productService.isInWishlist(id);
  }

  moveWishlistToCart(product: Product): void {
    this.productService.addToCart(product);
    this.productService.toggleWishlist(product);
    this.showAddedNotification(product.title);
  }

  private showAddedNotification(title: string): void {
    this.addedNotification.set(`Added "${title}" to cart`);
    setTimeout(() => {
      this.addedNotification.set(null);
    }, 2800);
  }

  applyPromo(): void {
    if (this.promoCode().trim().toUpperCase() === 'WELCOME10') {
      this.promoApplied.set(true);
    }
  }

  private closeOtherMenus(except: string[]): void {
    if (!except.includes('mobile')) this.isMobileMenuOpen.set(false);
    if (!except.includes('categories')) this.isCategoriesDropdownOpen.set(false);
    if (!except.includes('user')) this.isUserMenuOpen.set(false);
    if (!except.includes('cart')) this.isCartDrawerOpen.set(false);
    if (!except.includes('wishlist')) this.isWishlistDrawerOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.closeCategoriesDropdown();
    this.closeUserMenu();
    this.closeCartDrawer();
    this.closeWishlistDrawer();
    this.closeMobileMenu();
    this.isSearchFocused.set(false);
  }
}
