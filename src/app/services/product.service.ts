import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, debounceTime, distinctUntilChanged, forkJoin, map, of, switchMap } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { AuthService } from './auth.service';

export interface ProductReview {
  rating: number;
  comment: string;
  date: string;
  reviewerName: string;
  reviewerEmail: string;
}

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
  sku?: string;
  weight?: number;
  dimensions?: { width: number; height: number; depth: number };
  warrantyInformation?: string;
  shippingInformation?: string;
  availabilityStatus?: string;
  returnPolicy?: string;
  minimumOrderQuantity?: number;
  reviews?: ProductReview[];
  thumbnail: string;
  images?: string[];
  meta?: {
    createdAt: string;
    updatedAt: string;
  };
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

/** Form payload for admin add/edit product. */
export interface CustomProductInput {
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage?: number;
  rating?: number;
  stock?: number;
  brand?: string;
  thumbnail: string;
}

const CUSTOM_PRODUCTS_KEY = 'shopease_custom_products';

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
  private readonly auth = inject(AuthService);
  private readonly baseUrl = 'https://dummyjson.com/products';

  // Categories signal
  readonly categories = signal<ProductCategory[]>([]);
  readonly isLoadingCategories = signal(false);

  // Search state
  readonly searchQuery = signal('');
  readonly isSearching = signal(false);
  readonly searchResults = signal<Product[]>([]);

  // Featured Products state (home grid; category tabs filter this grid locally)
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

  /** Set when a guest tries an action that needs login (surfaced as a toast). */
  readonly authRequiredMessage = signal<string | null>(null);

  /**
   * Admin-added products, persisted in localStorage.
   * They are merged into the storefront (home grid, category pages,
   * ranked views and /product/:id) alongside the live DummyJSON catalog.
   */
  readonly customProducts = signal<Product[]>([]);

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
    this.loadCustomProducts();
    this.loadCategories();
    this.setupLiveSearch();
    this.loadFeaturedProducts();

    // Cart is per-user: load only when logged in, clear on logout.
    // Browsing (categories / products / search) stays public.
    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.loadCart();
      } else {
        this.cartItems.set([]);
        this.wishlistItems.set([]);
      }
    });

    // Reactively reload the home grid when its category tab changes.
    effect(() => {
      this.loadFeaturedProducts(this.selectedCategory());
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

  // Load featured products (optionally filtered by category).
  // Filtered views (category / deals / new / top) fetch a bigger pool.
  loadFeaturedProducts(categorySlug?: string | null, limit = 8): void {
    this.isLoadingFeatured.set(true);
    this.featuredError.set(null);
    const url = categorySlug
      ? `${this.baseUrl}/category/${encodeURIComponent(categorySlug)}?limit=${limit}`
      : `${this.baseUrl}?limit=${limit}`;

    this.http.get<ProductsResponse>(url).pipe(
      catchError((err) => {
        console.error('Failed to load featured products:', err);
        this.featuredError.set('Failed to load products. Please try again.');
        return of({ products: [], total: 0, skip: 0, limit: 0 });
      })
    ).subscribe((res) => {
      // Admin-added products lead the grid (filtered by category when active).
      const customs = this.matchingCustoms(categorySlug);
      this.featuredProducts.set([...customs, ...(res.products || [])].slice(0, limit));
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

  // Cart operations — login required (extra feature, not for browsing).
  addToCart(product: Product): boolean {
    if (!this.auth.isAuthenticated()) {
      this.flagAuthRequired('Please login to add products to your cart.');
      return false;
    }
    this.cartItems.update((items) => {
      const existing = items.find((i) => i.id === product.id);
      if (existing) {
        return items.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...items, { ...product, quantity: 1 }];
    });
    return true;
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

  // Wishlist operations — login required.
  toggleWishlist(product: Product): boolean {
    if (!this.auth.isAuthenticated()) {
      this.flagAuthRequired('Please login to use your wishlist.');
      return false;
    }
    this.wishlistItems.update((items) => {
      const exists = items.some((i) => i.id === product.id);
      if (exists) {
        return items.filter((i) => i.id !== product.id);
      }
      return [...items, product];
    });
    return true;
  }

  private flagAuthRequired(message: string): void {
    this.authRequiredMessage.set(message);
    this.auth.requireLogin();
    setTimeout(() => this.authRequiredMessage.set(null), 3000);
  }

  isInWishlist(id: number): boolean {
    return this.wishlistItems().some((i) => i.id === id);
  }

  // Category filter for the HOME grid tabs.
  selectCategory(categorySlug: string | null): void {
    this.selectedCategory.set(categorySlug);
  }

  /** Back to the plain homepage grid. */
  clearShopFilter(): void {
    this.selectedCategory.set(null);
  }

  // ---------- Single-product / catalog queries (used by routed pages) ----------

  /** One product by id — admin-added products resolve locally, rest via API. */
  getProduct(id: number | string): Observable<Product> {
    const custom = this.customProducts().find((p) => p.id === Number(id));
    if (custom) return of(custom);
    return this.http.get<Product>(`${this.baseUrl}/${id}`);
  }

  /** All products of a category — admin-added matches lead the list. */
  getCategoryProducts(categorySlug: string, limit = 24): Observable<ProductsResponse> {
    return this.http.get<ProductsResponse>(
      `${this.baseUrl}/category/${encodeURIComponent(categorySlug)}?limit=${limit}`
    ).pipe(
      map((res) => {
        const customs = this.matchingCustoms(categorySlug);
        const products = [...customs, ...(res.products ?? [])].slice(0, limit + customs.length);
        return { ...res, products, total: (res.total ?? 0) + customs.length };
      })
    );
  }

  /** Live text search — backs the navbar flyout, chatbot and admin browser. */
  searchProducts(term: string, limit = 8): Observable<ProductsResponse> {
    return this.http.get<ProductsResponse>(
      `${this.baseUrl}/search?q=${encodeURIComponent(term)}&limit=${limit}`
    );
  }

  /** A pool of products for client-side ranked views (deals / new / top). */
  getProductPool(limit = 60): Observable<ProductsResponse> {
    return this.http.get<ProductsResponse>(`${this.baseUrl}?limit=${limit}`).pipe(
      map((res) => ({
        ...res,
        products: [...this.customProducts(), ...(res.products ?? [])],
      }))
    );
  }

  // ---------- Admin-added products (localStorage) ----------

  /** Admin-added products of a category (or all when no slug). */
  matchingCustoms(categorySlug?: string | null): Product[] {
    const customs = this.customProducts();
    if (!categorySlug) return customs;
    return customs.filter((p) => p.category === categorySlug);
  }

  /** Add a store product (admin). Persists to localStorage, returns the product. */
  addCustomProduct(input: CustomProductInput): Product {
    const now = new Date().toISOString();
    const product: Product = {
      id: Date.now(),
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      price: Number(input.price),
      discountPercentage: Number(input.discountPercentage ?? 0),
      rating: Number(input.rating ?? 4.5),
      stock: Number(input.stock ?? 10),
      brand: input.brand?.trim() || undefined,
      thumbnail: input.thumbnail.trim(),
      images: [input.thumbnail.trim()],
      tags: ['store'],
      availabilityStatus: Number(input.stock ?? 10) > 0 ? 'In Stock' : 'Out of Stock',
      returnPolicy: '30 days return policy',
      meta: { createdAt: now, updatedAt: now },
    };
    this.customProducts.update((list) => [product, ...list]);
    this.persistCustomProducts();
    return product;
  }

  /** Modify an admin-added product. Returns false when the id is unknown. */
  updateCustomProduct(id: number, patch: Partial<CustomProductInput>): boolean {
    let found = false;
    this.customProducts.update((list) =>
      list.map((p) => {
        if (p.id !== id) return p;
        found = true;
        const next: Product = {
          ...p,
          title: patch.title?.trim() || p.title,
          description: patch.description?.trim() || p.description,
          category: patch.category || p.category,
          price: patch.price !== undefined ? Number(patch.price) : p.price,
          discountPercentage: patch.discountPercentage !== undefined ? Number(patch.discountPercentage) : p.discountPercentage,
          rating: patch.rating !== undefined ? Number(patch.rating) : p.rating,
          stock: patch.stock !== undefined ? Number(patch.stock) : p.stock,
          brand: patch.brand !== undefined ? patch.brand.trim() || undefined : p.brand,
          thumbnail: patch.thumbnail?.trim() || p.thumbnail,
          meta: { createdAt: p.meta?.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() },
        };
        next.images = [next.thumbnail];
        next.availabilityStatus = next.stock > 0 ? 'In Stock' : 'Out of Stock';
        return next;
      })
    );
    if (found) this.persistCustomProducts();
    return found;
  }

  /** Delete an admin-added product (also drops it from carts/wishlists). */
  deleteCustomProduct(id: number): boolean {
    const exists = this.customProducts().some((p) => p.id === id);
    if (!exists) return false;
    this.customProducts.update((list) => list.filter((p) => p.id !== id));
    this.cartItems.update((items) => items.filter((i) => i.id !== id));
    this.wishlistItems.update((items) => items.filter((i) => i.id !== id));
    this.persistCustomProducts();
    return true;
  }

  private loadCustomProducts(): void {
    try {
      const raw = localStorage.getItem(CUSTOM_PRODUCTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      this.customProducts.set(Array.isArray(parsed) ? parsed : []);
    } catch {
      this.customProducts.set([]);
    }
  }

  private persistCustomProducts(): void {
    try {
      localStorage.setItem(CUSTOM_PRODUCTS_KEY, JSON.stringify(this.customProducts()));
    } catch { /* ignore */ }
    // Refresh the home grid so additions/edits show up immediately.
    this.loadFeaturedProducts(this.selectedCategory());
  }
}
