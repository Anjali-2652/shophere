import { Component, HostListener, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  category: string;
}

export interface CategoryItem {
  name: string;
  icon: string;
  count?: string;
  subcategories: string[];
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  // Navigation & Drawer States
  readonly isMobileMenuOpen = signal(false);
  readonly isCategoriesDropdownOpen = signal(false);
  readonly isUserMenuOpen = signal(false);
  readonly isCartDrawerOpen = signal(false);
  readonly isMobileCategoriesExpanded = signal(false);

  // Search state
  readonly searchQuery = signal('');
  readonly isSearchFocused = signal(false);

  // Active navigation link
  readonly activeNav = signal<string>('Home');

  // Notification badges
  readonly wishlistCount = signal(3);

  // Nav Links matching mockups
  readonly navLinks = [
    { label: 'Home', hasDropdown: false },
    { label: 'Categories', hasDropdown: true },
    { label: 'Deals', hasDropdown: false, badge: 'HOT' },
    { label: 'New Arrivals', hasDropdown: false },
    { label: 'Best Sellers', hasDropdown: false },
  ];

  // Category data matching mockups
  readonly categories: CategoryItem[] = [
    {
      name: 'Electronics',
      icon: 'laptop',
      subcategories: ['Wireless Headphones', 'Laptops & PCs', 'Smart Watches', 'Tablets', 'Bluetooth Speakers'],
    },
    {
      name: 'Fashion',
      icon: 'shirt',
      subcategories: ["Men's Wear", "Women's Wear", 'Sneakers & Shoes', 'Accessories', 'Watches'],
    },
    {
      name: 'Home & Living',
      icon: 'armchair',
      subcategories: ['Modern Furniture', 'Decorative Lighting', 'Kitchen & Dining', 'Bedding'],
    },
    {
      name: 'Beauty & Health',
      icon: 'sparkles',
      subcategories: ['Luxury Perfumes', 'Skin Care', 'Organic Cosmetics', 'Hair Wellness'],
    },
    {
      name: 'Sports & Outdoors',
      icon: 'activity',
      subcategories: ['Athletic Shoes', 'Fitness Gear', 'Outdoor & Camping', 'Yoga & Wellness'],
    },
    {
      name: 'Toys & Games',
      icon: 'gamepad-2',
      subcategories: ['Video Gaming', 'Board Games', 'Collectible Figures', 'Creative Puzzles'],
    },
    {
      name: 'Books & Stationery',
      icon: 'book-open',
      subcategories: ['Bestsellers', 'Art & Design', 'Journals & Planners', 'Gift Sets'],
    },
  ];

  // Cart Items matching design screen 4
  readonly cartItems = signal<CartItem[]>([
    {
      id: 1,
      name: 'Wireless Headphones',
      price: 59.99,
      quantity: 1,
      image: '🎧',
      category: 'Electronics',
    },
    {
      id: 2,
      name: 'Smart Watch',
      price: 89.99,
      quantity: 1,
      image: '⌚',
      category: 'Electronics',
    },
    {
      id: 3,
      name: 'Running Shoes',
      price: 49.99,
      quantity: 1,
      image: '👟',
      category: 'Fashion',
    },
  ]);

  // Computed Cart values
  readonly cartCount = computed(() =>
    this.cartItems().reduce((total, item) => total + item.quantity, 0)
  );

  readonly subtotal = computed(() =>
    this.cartItems().reduce((total, item) => total + item.price * item.quantity, 0)
  );

  readonly shipping = computed(() => (this.subtotal() > 50 ? 0 : 9.99));

  readonly total = computed(() => this.subtotal() + this.shipping());

  // Search trending recommendations
  readonly trendingSearches = [
    'Wireless Headphones',
    'Smart Watch',
    'AirPods',
    'Dior Sauvage',
    'Air Jordan 1',
    'MacBook Pro',
  ];

  // User Profile information matching dashboard mockup
  readonly currentUser = {
    name: 'Anjali Gupta',
    email: 'anjali@example.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
  };

  // Promo code signal
  readonly promoCode = signal('');
  readonly promoApplied = signal(false);

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

  // Cart operations
  incrementQuantity(id: number): void {
    this.cartItems.update((items) =>
      items.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item))
    );
  }

  decrementQuantity(id: number): void {
    this.cartItems.update((items) =>
      items
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  removeItem(id: number): void {
    this.cartItems.update((items) => items.filter((item) => item.id !== id));
  }

  // Search actions
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  selectTrendingSearch(term: string): void {
    this.searchQuery.set(term);
    this.isSearchFocused.set(false);
  }

  clearSearch(): void {
    this.searchQuery.set('');
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
  }

  // Close open dropdowns when clicking outside or pressing Escape
  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.closeCategoriesDropdown();
    this.closeUserMenu();
    this.closeCartDrawer();
    this.closeMobileMenu();
    this.isSearchFocused.set(false);
  }
}
