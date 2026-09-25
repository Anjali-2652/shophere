import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Product, ProductService } from '../services/product.service';
import { AuthService } from '../services/auth.service';

export interface CategoryGroup {
  name: string;
  icon: string;
  slugs: string[];
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  readonly productService = inject(ProductService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

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

  // User Profile information — live from AuthService when logged in
  get currentUser(): { name: string; email: string; avatar: string } {
    const u = this.auth.currentUser();
    if (u) return { name: u.name, email: u.email, avatar: u.avatar || '' };
    return {
      name: 'Guest',
      email: 'Login to unlock cart & wishlist',
      avatar: 'https://ui-avatars.com/api/?name=G&background=0f3d3e&color=ffd166&bold=true',
    };
  }

  // Promo code
  readonly promoCode = signal('');
  readonly promoApplied = signal(false);
  readonly promoError = signal<string | null>(null);

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
    // Cart is an extra feature — guests are sent to login first.
    if (!this.auth.isAuthenticated()) {
      this.auth.requireLogin(this.router.url);
      this.showAddedNotification('Please login to view your cart');
      return;
    }
    this.isCartDrawerOpen.update((v) => !v);
    if (this.isCartDrawerOpen()) {
      this.closeOtherMenus(['cart']);
    }
  }

  closeCartDrawer(): void {
    this.isCartDrawerOpen.set(false);
  }

  toggleWishlistDrawer(): void {
    if (!this.auth.isAuthenticated()) {
      this.auth.requireLogin(this.router.url);
      this.showAddedNotification('Please login to view your wishlist');
      return;
    }
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
    // Every nav link now performs a real action (previously Deals / New Arrivals /
    // Best Sellers only highlighted and did nothing).
    switch (link) {
      case 'Home':
        this.closeCategoriesDropdown();
        this.goHome();
        break;
      case 'Categories':
        this.toggleCategoriesDropdown();
        break;
      case 'Deals':
        this.closeCategoriesDropdown();
        this.shopView('deals');
        break;
      case 'New Arrivals':
        this.closeCategoriesDropdown();
        this.shopView('new');
        break;
      case 'Best Sellers':
        this.closeCategoriesDropdown();
        this.shopView('top');
        break;
      default:
        this.closeCategoriesDropdown();
    }
  }

  /** Home: clear filters, go to `/`, scroll to top. */
  goHome(): void {
    this.activeNav.set('Home');
    this.productService.clearShopFilter();
    this.closeCategoriesDropdown();
    this.closeMobileMenu();
    if (this.router.url !== '/') {
      this.router.navigate(['/']).then(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /** Deals / New Arrivals / Best Sellers — real API-backed filters + scroll to grid. */
  shopView(mode: 'deals' | 'new' | 'top'): void {
    this.activeNav.set(mode === 'deals' ? 'Deals' : mode === 'new' ? 'New Arrivals' : 'Best Sellers');
    if (mode === 'deals') this.productService.showDeals();
    else if (mode === 'new') this.productService.showNewArrivals();
    else this.productService.showBestSellers();
    this.closeCategoriesDropdown();
    this.closeMobileMenu();
    this.isSearchFocused.set(false);
    this.scrollToFeatured();
  }

  /** Scroll to the Featured grid, navigating home first when on another route. */
  scrollToFeatured(): void {
    if (this.router.url !== '/') {
      this.router.navigate(['/']).then(() => this.scrollToId('featured-products'));
    } else {
      this.scrollToId('featured-products');
    }
  }

  /** Scroll to the Categories section (works on mobile too). */
  scrollToCategories(): void {
    this.isSearchFocused.set(false);
    this.closeMobileMenu();
    if (this.router.url !== '/') {
      this.router.navigate(['/']).then(() => this.scrollToId('shop-categories'));
    } else {
      this.scrollToId('shop-categories');
    }
  }

  private scrollToId(id: string): void {
    // Wait a tick so navigation / rendering finishes before scrolling.
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
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
    this.scrollToFeatured();
  }

  // Cart operations via service
  addToCart(product: Product, event?: Event): void {
    if (event) event.stopPropagation();
    const added = this.productService.addToCart(product);
    if (added) this.showAddedNotification(product.title);
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
    const added = this.productService.addToCart(product);
    if (!added) return;
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
    const code = this.promoCode().trim().toUpperCase();
    if (code === 'WELCOME10') {
      this.promoApplied.set(true);
      this.promoError.set(null);
    } else if (!code) {
      this.promoError.set('Enter a promo code first.');
    } else {
      this.promoApplied.set(false);
      this.promoError.set(`"${this.promoCode().trim()}" is not valid. Try WELCOME10.`);
    }
  }

  goToLogin(): void {
    this.closeUserMenu();
    this.closeMobileMenu();
    this.auth.requireLogin(this.router.url);
  }

  logout(): void {
    this.closeUserMenu();
    this.closeCartDrawer();
    this.closeWishlistDrawer();
    this.auth.logout();
  }

  checkout(): void {
    if (!this.auth.requireLogin('/checkout')) return;
    this.closeCartDrawer();
    this.router.navigate(['/checkout']);
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
