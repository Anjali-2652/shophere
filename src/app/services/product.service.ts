import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, debounceTime, distinctUntilChanged, forkJoin, map, of, switchMap } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

export interface Product {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  tags?: string[];
  brand?: string;
  thumbnail: string;
  images?: string[];
}

export interface ProductCategory {
  slug: string;
  name: string;
  url: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}

export interface CartProduct extends Product {
  quantity: number;
}

// DummyJSON cart API response types
export interface CartApiProduct {
  id: number;
  title: string;
  price: number;
  quantity: number;
  total: number;
  discountPercentage: number;
  discountedTotal: number;
  thumbnail: string;
}

export interface CartApiResponse {
  id: number;
  products: CartApiProduct[];
  total: number;
  discountedTotal: number;
  userId: number;
  totalProducts: number;
  totalQuantity: number;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://dummyjson.com/products';

  // Categories signal
  readonly categories = signal<ProductCategory[]>([]);
  readonly isLoadingCategories = signal(false);

  // Search state
  readonly searchQuery = signal('');
  readonly isSearching = signal(false);
  readonly searchResults = signal<Product[]>([]);

  // Featured Products state
  readonly featuredProducts = signal<Product[]>([]);
  readonly isLoadingFeatured = signal(false);
  readonly selectedCategory = signal<string | null>(null);

  // Modal Quick View State
  readonly quickViewProduct = signal<Product | null>(null);

  // Cart state — fetched from API, starts empty
  readonly cartItems = signal<CartProduct[]>([]);
  readonly isLoadingCart = signal(false);
  readonly cartError = signal<string | null>(null);

  // Wishlist state — starts empty, user adds items
  readonly wishlistItems = signal<Product[]>([]);

  // Cart Computed Metrics
  readonly cartCount = computed(() =>
    this.cartItems().reduce((acc, item) => acc + item.quantity, 0)
  );

  readonly wishlistCount = computed(() => this.wishlistItems().length);

  readonly subtotal = computed(() =>
    this.cartItems().reduce((acc, item) => acc + item.price * item.quantity, 0)
  );

  readonly shipping = computed(() => (this.subtotal() > 50 || this.cartCount() === 0 ? 0 : 9.99));

  readonly total = computed(() => this.subtotal() + this.shipping());

  constructor() {
    this.loadCategories();
    this.setupLiveSearch();
    this.loadFeaturedProducts();
    this.loadCart();

    // Reactively reload featured products when selectedCategory changes
    effect(() => {
      const cat = this.selectedCategory();
      this.loadFeaturedProducts(cat);
    });
  }

  // Error state for categories
  readonly categoriesError = signal<string | null>(null);

  // Fetch categories from https://dummyjson.com/products/categories
  loadCategories(): void {
    this.isLoadingCategories.set(true);
    this.categoriesError.set(null);
    this.http.get<ProductCategory[]>(`${this.baseUrl}/categories`).pipe(
      catchError((err) => {
        console.error('Failed to load categories:', err);
        this.categoriesError.set('Failed to load categories. Please try again.');
        return of([]);
      })
    ).subscribe((data) => {
      this.categories.set(data);
      this.isLoadingCategories.set(false);
    });
  }

  // Error state for featured products
  readonly featuredError = signal<string | null>(null);

  // Load featured products (optionally filtered by category)
  loadFeaturedProducts(categorySlug?: string | null): void {
    this.isLoadingFeatured.set(true);
    this.featuredError.set(null);
    const url = categorySlug
      ? `${this.baseUrl}/category/${encodeURIComponent(categorySlug)}?limit=8`
      : `${this.baseUrl}?limit=8`;

    this.http.get<ProductsResponse>(url).pipe(
      catchError((err) => {
        console.error('Failed to load featured products:', err);
        this.featuredError.set('Failed to load products. Please try again.');
        return of({ products: [], total: 0, skip: 0, limit: 0 });
      })
    ).subscribe((res) => {
      this.featuredProducts.set(res.products || []);
      this.isLoadingFeatured.set(false);
    });
  }

  // Fetch cart from DummyJSON /carts API and enrich with full product details
  loadCart(): void {
    this.isLoadingCart.set(true);
    this.cartError.set(null);

    this.http.get<CartApiResponse>('https://dummyjson.com/carts/1').pipe(
      switchMap((cart) => {
        if (!cart.products || cart.products.length === 0) {
          return of([]);
        }
        // Fetch full product details for each cart item
        const productRequests = cart.products.map((cartItem) =>
          this.http.get<Product>(`${this.baseUrl}/${cartItem.id}`).pipe(
            map((fullProduct) => ({
              ...fullProduct,
              quantity: cartItem.quantity,
            } as CartProduct)),
            catchError(() => of(null))
          )
        );
        return forkJoin(productRequests);
      }),
      catchError((err) => {
        console.error('Failed to load cart:', err);
        this.cartError.set('Failed to load cart. Please try again.');
        return of([]);
      })
    ).subscribe((items) => {
      // Filter out any null items from failed individual product fetches
      const validItems = (items as (CartProduct | null)[]).filter(
        (item): item is CartProduct => item !== null
      );
      this.cartItems.set(validItems);
      this.isLoadingCart.set(false);
    });
  }

  // Setup debounced live search querying https://dummyjson.com/products/search?q=...
  private setupLiveSearch(): void {
    toObservable(this.searchQuery)
      .pipe(
        debounceTime(280),
        distinctUntilChanged(),
        switchMap((query) => {
          const trimmed = query.trim();
          if (!trimmed) {
            this.isSearching.set(false);
            return of({ products: [], total: 0, skip: 0, limit: 0 });
          }
          this.isSearching.set(true);
          return this.http
            .get<ProductsResponse>(`${this.baseUrl}/search?q=${encodeURIComponent(trimmed)}&limit=8`)
            .pipe(
              catchError((err) => {
                console.error('Search error:', err);
                return of({ products: [], total: 0, skip: 0, limit: 0 });
              })
            );
        })
      )
      .subscribe((res) => {
        this.searchResults.set(res.products || []);
        this.isSearching.set(false);
      });
  }

  // Direct search action
  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  // Quick View Modal
  openQuickView(product: Product): void {
    this.quickViewProduct.set(product);
  }

  closeQuickView(): void {
    this.quickViewProduct.set(null);
  }

  // Cart operations
  addToCart(product: Product): void {
    this.cartItems.update((items) => {
      const existing = items.find((i) => i.id === product.id);
      if (existing) {
        return items.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...items, { ...product, quantity: 1 }];
    });
  }

  removeFromCart(id: number): void {
    this.cartItems.update((items) => items.filter((item) => item.id !== id));
  }

  updateQuantity(id: number, delta: number): void {
    this.cartItems.update((items) =>
      items
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  // Wishlist operations
  toggleWishlist(product: Product): void {
    this.wishlistItems.update((items) => {
      const exists = items.some((i) => i.id === product.id);
      if (exists) {
        return items.filter((i) => i.id !== product.id);
      }
      return [...items, product];
    });
  }

  isInWishlist(id: number): boolean {
    return this.wishlistItems().some((i) => i.id === id);
  }

  // Category filter
  selectCategory(categorySlug: string | null): void {
    this.selectedCategory.set(categorySlug);
  }
}
