import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
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

  // Cart state initialized with realistic DummyJSON items
  readonly cartItems = signal<CartProduct[]>([
    {
      id: 1,
      title: 'Essence Mascara Lash Princess',
      description: 'The Essence Mascara Lash Princess is a popular mascara known for volumizing lashes.',
      category: 'beauty',
      price: 9.99,
      discountPercentage: 10.48,
      rating: 4.94,
      stock: 99,
      brand: 'Essence',
      thumbnail: 'https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/thumbnail.webp',
      quantity: 2,
    },
    {
      id: 2,
      title: 'Eyeshadow Palette with Mirror',
      description: 'A versatile range of eyeshadow shades for creating stunning eye looks.',
      category: 'beauty',
      price: 19.99,
      discountPercentage: 18.19,
      rating: 4.86,
      stock: 34,
      brand: 'Glamour Beauty',
      thumbnail: 'https://cdn.dummyjson.com/product-images/beauty/eyeshadow-palette-with-mirror/thumbnail.webp',
      quantity: 1,
    },
    {
      id: 3,
      title: 'Powder Canister',
      description: 'Finely milled setting powder designed to set makeup and control shine.',
      category: 'beauty',
      price: 14.99,
      discountPercentage: 9.84,
      rating: 4.64,
      stock: 89,
      brand: 'Velvet Touch',
      thumbnail: 'https://cdn.dummyjson.com/product-images/beauty/powder-canister/thumbnail.webp',
      quantity: 1,
    },
  ]);

  // Wishlist state
  readonly wishlistItems = signal<Product[]>([
    {
      id: 4,
      title: 'Red Lipstick',
      description: 'Classic and bold choice for adding a pop of color to your lips.',
      category: 'beauty',
      price: 12.99,
      discountPercentage: 12.16,
      rating: 4.36,
      stock: 91,
      brand: 'Chic Cosmetics',
      thumbnail: 'https://cdn.dummyjson.com/product-images/beauty/red-lipstick/thumbnail.webp',
    },
    {
      id: 5,
      title: 'Red Nail Polish',
      description: 'Rich and glossy red hue for vibrant and polished nails.',
      category: 'beauty',
      price: 8.99,
      discountPercentage: 11.44,
      rating: 4.32,
      stock: 79,
      brand: 'Nail Couture',
      thumbnail: 'https://cdn.dummyjson.com/product-images/beauty/red-nail-polish/thumbnail.webp',
    },
  ]);

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

    // Reactively reload featured products when selectedCategory changes
    effect(() => {
      const cat = this.selectedCategory();
      this.loadFeaturedProducts(cat);
    });
  }

  // Fetch categories from https://dummyjson.com/products/categories
  loadCategories(): void {
    this.isLoadingCategories.set(true);
    this.http.get<ProductCategory[]>(`${this.baseUrl}/categories`).pipe(
      catchError((err) => {
        console.warn('Failed to load categories from API, using fallback defaults:', err);
        return of([
          { slug: 'beauty', name: 'Beauty', url: `${this.baseUrl}/category/beauty` },
          { slug: 'fragrances', name: 'Fragrances', url: `${this.baseUrl}/category/fragrances` },
          { slug: 'furniture', name: 'Furniture', url: `${this.baseUrl}/category/furniture` },
          { slug: 'groceries', name: 'Groceries', url: `${this.baseUrl}/category/groceries` },
          { slug: 'home-decoration', name: 'Home Decoration', url: `${this.baseUrl}/category/home-decoration` },
          { slug: 'kitchen-accessories', name: 'Kitchen Accessories', url: `${this.baseUrl}/category/kitchen-accessories` },
          { slug: 'laptops', name: 'Laptops', url: `${this.baseUrl}/category/laptops` },
          { slug: 'mens-shirts', name: 'Mens Shirts', url: `${this.baseUrl}/category/mens-shirts` },
          { slug: 'mens-shoes', name: 'Mens Shoes', url: `${this.baseUrl}/category/mens-shoes` },
          { slug: 'mens-watches', name: 'Mens Watches', url: `${this.baseUrl}/category/mens-watches` },
          { slug: 'mobile-accessories', name: 'Mobile Accessories', url: `${this.baseUrl}/category/mobile-accessories` },
          { slug: 'skin-care', name: 'Skin Care', url: `${this.baseUrl}/category/skin-care` },
          { slug: 'smartphones', name: 'Smartphones', url: `${this.baseUrl}/category/smartphones` },
          { slug: 'sports-accessories', name: 'Sports Accessories', url: `${this.baseUrl}/category/sports-accessories` },
          { slug: 'sunglasses', name: 'Sunglasses', url: `${this.baseUrl}/category/sunglasses` },
          { slug: 'tablets', name: 'Tablets', url: `${this.baseUrl}/category/tablets` },
          { slug: 'womens-bags', name: 'Womens Bags', url: `${this.baseUrl}/category/womens-bags` },
          { slug: 'womens-dresses', name: 'Womens Dresses', url: `${this.baseUrl}/category/womens-dresses` },
          { slug: 'womens-jewellery', name: 'Womens Jewellery', url: `${this.baseUrl}/category/womens-jewellery` },
          { slug: 'womens-shoes', name: 'Womens Shoes', url: `${this.baseUrl}/category/womens-shoes` },
          { slug: 'womens-watches', name: 'Womens Watches', url: `${this.baseUrl}/category/womens-watches` },
        ]);
      })
    ).subscribe((data) => {
      this.categories.set(data);
      this.isLoadingCategories.set(false);
    });
  }

  // Load featured products (optionally filtered by category)
  loadFeaturedProducts(categorySlug?: string | null): void {
    this.isLoadingFeatured.set(true);
    const url = categorySlug
      ? `${this.baseUrl}/category/${encodeURIComponent(categorySlug)}?limit=8`
      : `${this.baseUrl}?limit=8`;

    this.http.get<ProductsResponse>(url).pipe(
      catchError((err) => {
        console.warn('Failed to load featured products from API, using fallback defaults:', err);
        return of({
          products: [
            {
              id: 78,
              title: 'Apple MacBook Pro 14 Inch',
              description: 'Powerful and sleek laptop with Retina display and M1 Pro performance.',
              category: 'laptops',
              price: 1999.99,
              discountPercentage: 4.69,
              rating: 4.85,
              stock: 24,
              brand: 'Apple',
              thumbnail: 'https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/thumbnail.webp',
            },
            {
              id: 88,
              title: 'Nike Air Jordan 1 Retro',
              description: 'Iconic basketball sneaker known for stylish design and performance.',
              category: 'mens-shoes',
              price: 149.99,
              discountPercentage: 4.12,
              rating: 4.77,
              stock: 12,
              brand: 'Nike',
              thumbnail: 'https://cdn.dummyjson.com/product-images/mens-shoes/nike-air-jordan-1-red-and-black/thumbnail.webp',
            },
            {
              id: 6,
              title: 'Calvin Klein CK One',
              description: 'Classic unisex fragrance known for its fresh and clean scent.',
              category: 'fragrances',
              price: 49.99,
              discountPercentage: 10.0,
              rating: 4.65,
              stock: 29,
              brand: 'Calvin Klein',
              thumbnail: 'https://cdn.dummyjson.com/product-images/fragrances/calvin-klein-ck-one/thumbnail.webp',
            },
            {
              id: 11,
              title: 'Annibale Colombo Bed',
              description: 'Luxurious and elegant bed frame crafted with high-quality materials.',
              category: 'furniture',
              price: 1899.99,
              discountPercentage: 8.57,
              rating: 4.77,
              stock: 8,
              brand: 'Annibale Colombo',
              thumbnail: 'https://cdn.dummyjson.com/product-images/furniture/annibale-colombo-bed/thumbnail.webp',
            },
            {
              id: 1,
              title: 'Essence Mascara Lash Princess',
              description: 'Popular mascara known for volumizing and lengthening effects.',
              category: 'beauty',
              price: 9.99,
              discountPercentage: 10.48,
              rating: 4.94,
              stock: 99,
              brand: 'Essence',
              thumbnail: 'https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/thumbnail.webp',
            },
            {
              id: 137,
              title: 'American Football Ball',
              description: 'Classic ball used for throwing and catching games.',
              category: 'sports-accessories',
              price: 19.99,
              discountPercentage: 5.0,
              rating: 4.91,
              stock: 53,
              brand: 'Spalding',
              thumbnail: 'https://cdn.dummyjson.com/product-images/sports-accessories/american-football/thumbnail.webp',
            },
            {
              id: 83,
              title: 'Blue & Black Check Shirt',
              description: 'Stylish and comfortable men shirt featuring a classic check pattern.',
              category: 'mens-shirts',
              price: 29.99,
              discountPercentage: 15.35,
              rating: 4.64,
              stock: 38,
              brand: 'Fashion Trends',
              thumbnail: 'https://cdn.dummyjson.com/product-images/mens-shirts/blue-&-black-check-shirt/thumbnail.webp',
            },
            {
              id: 2,
              title: 'Eyeshadow Palette with Mirror',
              description: 'Versatile range of eyeshadow shades for creating stunning eye looks.',
              category: 'beauty',
              price: 19.99,
              discountPercentage: 18.19,
              rating: 4.86,
              stock: 34,
              brand: 'Glamour Beauty',
              thumbnail: 'https://cdn.dummyjson.com/product-images/beauty/eyeshadow-palette-with-mirror/thumbnail.webp',
            },
          ],
          total: 8,
          skip: 0,
          limit: 8,
        });
      })
    ).subscribe((res) => {
      this.featuredProducts.set(res.products || []);
      this.isLoadingFeatured.set(false);
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
