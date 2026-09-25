import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, delay, map, of } from 'rxjs';
import type { Product, ProductCategory, ProductsResponse } from './product.service';

export interface ChatAction {
  label: string;
  kind: 'search' | 'category' | 'view' | 'route';
  /** search term | category slug | deals/new/top | router path */
  value: string;
}

export interface BotReply {
  text: string;
  products?: Product[];
  actions?: ChatAction[];
}

const BASE = 'https://dummyjson.com/products';
const REPLY_DELAY_MS = 650;

const VIEW_ACTIONS: ChatAction[] = [
  { label: 'Show deals', kind: 'view', value: 'deals' },
  { label: 'New arrivals', kind: 'view', value: 'new' },
  { label: 'Best sellers', kind: 'view', value: 'top' },
];

/** Words stripped from the front of a search request to isolate the product term. */
function extractSearchTerm(query: string): string | null {
  let t = query.toLowerCase().trim();
  t = t
    .replace(/^(please\s+)?(can you\s+)?(help me\s+)?/, '')
    .replace(/^(do you have|have you got|is there|are there|any)\s+/, '')
    .replace(/^(i'?m looking for|looking for|look for|search for|search|find me|find|show me|give me|get me|i need|i want|need|want to buy|want|buy|get|show|display|suggest|recommend)\s+/, '')
    .replace(/^(me\s+)?(some\s+|a\s+|an\s+|the\s+)?/, '')
    .replace(/\?+$/, '')
    .replace(/\s+please$/, '')
    .trim();
  const stop = new Set(['product', 'products', 'something', 'anything', 'stuff', 'item', 'items', 'help', '']);
  if (stop.has(t) || t.length < 2) return null;
  return t;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly http = inject(HttpClient);

  ask(raw: string): Observable<BotReply> {
    const q = raw.toLowerCase().trim();

    if (!q) {
      return this.reply({ text: 'Type a product name and I will look it up in the live catalog for you.' });
    }

    // Greetings
    if (/^(hi|hii+|hello|hey|namaste|yo|good (morning|afternoon|evening))\b/.test(q) || q === 'hi') {
      return this.reply({
        text: 'Hello! I can help you find products, compare prices and ratings, show deals, and guide you through cart, checkout and orders. What are you looking for?',
        actions: [
          { label: 'Show deals', kind: 'view', value: 'deals' },
          { label: 'Browse categories', kind: 'search', value: 'categories' },
          { label: 'Best sellers', kind: 'view', value: 'top' },
        ],
      });
    }

    if (/\b(thank|thanks|thx|dhanyavad)\b/.test(q)) {
      return this.reply({ text: 'You are welcome! Anything else I can help you find?' });
    }
    if (/^(bye|goodbye|see you|later)\b/.test(q)) {
      return this.reply({ text: 'Goodbye! Happy shopping.' });
    }
    if (/who are you|your name|what are you/.test(q)) {
      return this.reply({ text: 'I am the ShopEase shopping assistant. I search the live product catalog and help with cart, wishlist, checkout and orders.' });
    }

    // Categories
    if (/\bcategor/.test(q)) {
      return this.categoryListReply();
    }

    // Deals / discounts / promo
    if (/\b(deal|deals|discount|offer|coupon|promo|sale|cheap|cheapest|affordable|budget|under)\b/.test(q)) {
      const maxMatch = q.match(/under\s*\$?\s*(\d+)/);
      const maxPrice = maxMatch ? Number(maxMatch[1]) : null;
      return this.poolReply(
        maxPrice != null
          ? `Here are well-rated picks under $${maxPrice} from the live catalog:`
          : 'Here are the biggest discounts in the catalog right now (plus code WELCOME10 for 10% off at checkout):',
        maxPrice != null
          ? (list) => list.filter((p) => p.price <= maxPrice).sort((a, b) => b.rating - a.rating).slice(0, 5)
          : (list) => [...list].sort((a, b) => b.discountPercentage - a.discountPercentage).slice(0, 5),
        [{ label: 'Open all deals', kind: 'view', value: 'deals' }]
      );
    }

    // New arrivals (backed by meta.createdAt)
    if (/\b(new arrival|new product|latest|just launched|what'?s new)\b/.test(q)) {
      return this.poolReply(
        'These are the latest additions to the catalog:',
        (list) =>
          [...list].sort((a, b) => +new Date(b.meta?.createdAt ?? 0) - +new Date(a.meta?.createdAt ?? 0)).slice(0, 5),
        [{ label: 'Open new arrivals', kind: 'view', value: 'new' }]
      );
    }

    // Best sellers (backed by rating)
    if (/\b(best ?seller|bestseller|top rated|most popular|popular|recommend|trending)\b/.test(q)) {
      return this.poolReply(
        'These top-rated picks are customer favourites:',
        (list) => [...list].sort((a, b) => b.rating - a.rating).slice(0, 5),
        [{ label: 'Open best sellers', kind: 'view', value: 'top' }]
      );
    }

    // Price questions
    if (/\b(price|cost|how much|rate)\b/.test(q)) {
      const term = extractSearchTerm(q);
      if (!term) {
        return this.reply({ text: 'Tell me the product name — for example, "price of Essence Mascara" — and I will look it up.' });
      }
      return this.searchReply(term, (top) =>
        `"${top.title}" costs $${top.price.toFixed(2)}${top.discountPercentage > 0 ? ` (${top.discountPercentage.toFixed(0)}% off)` : ''} with a ${top.rating} star rating.`
      );
    }

    // Stock questions
    if (/\b(stock|available|availability|in stock)\b/.test(q)) {
      const term = extractSearchTerm(q);
      if (!term) {
        return this.reply({ text: 'Tell me the product name — for example, "is iPhone 6 in stock?"' });
      }
      return this.searchReply(term, (top) =>
        top.stock > 0
          ? `Yes — "${top.title}" is in stock (${top.stock} units available) at $${top.price.toFixed(2)}.`
          : `Sorry — "${top.title}" is currently out of stock.`
      );
    }

    // Rating / review questions
    if (/\b(rating|rated|review|stars)\b/.test(q)) {
      const term = extractSearchTerm(q);
      if (!term) {
        return this.reply({ text: 'Tell me the product name and I will share its rating.' });
      }
      return this.searchReply(term, (top) => `"${top.title}" is rated ${top.rating} out of 5.`);
    }

    // Cart / wishlist how-to
    if (/\b(cart|bag|basket)\b/.test(q) && /\b(how|add|use|work)\b/.test(q)) {
      return this.reply({
        text: 'Tap Add on any product card to put it in your cart (login required). Open the cart icon in the top bar to change quantities, apply code WELCOME10, and checkout.',
      });
    }
    if (/\b(checkout|check out|place order|buy now|proceed)\b/.test(q)) {
      return this.reply({
        text: 'Checkout needs a login first. Your cart summary, shipping form and order confirmation all live on the checkout page.',
        actions: [{ label: 'Go to checkout', kind: 'route', value: '/checkout' }],
      });
    }
    if (/\b(wishlist|favourite|favorite|save for later|saved)\b/.test(q)) {
      return this.reply({ text: 'Tap the heart icon on any product to save it to your wishlist (login required). Open the heart icon in the top bar to view saved items or move them to your cart.' });
    }

    // Orders / tracking / shipping
    if (/\b(my orders|order history|past orders|track|tracking|delivery|shipping|where.*order|order.*status)\b/.test(q)) {
      return this.reply({
        text: 'Orders you place at checkout are saved under your account with an order ID, items and total. Open your account to see them. Shipping is free over $50, otherwise $9.99.',
        actions: [{ label: 'View my orders', kind: 'route', value: '/account' }],
      });
    }

    // Login / register / account
    if (/\b(login|log in|sign in|signin|register|sign up|signup|create account|account)\b/.test(q)) {
      return this.reply({
        text: 'Browsing is free, but cart, wishlist, checkout and orders need a login. Register with your name, email and password — your session token is saved on this device and expires on logout.',
        actions: [
          { label: 'Login', kind: 'route', value: '/login' },
          { label: 'Register', kind: 'route', value: '/register' },
        ],
      });
    }

    // Returns / payment / support
    if (/\b(return|refund|exchange)\b/.test(q)) {
      return this.reply({ text: 'Most products carry a 30-day return policy (shown on each product). For help with a specific order, check it under My Orders first.' });
    }
    if (/\b(pay|payment|card|upi)\b/.test(q)) {
      return this.reply({ text: 'Checkout accepts card payment (demo mode — nothing is really charged). Visa, Mastercard, PayPal and Apple Pay are listed as accepted methods.' });
    }
    if (/\b(human|agent|support|contact|call|phone|email)\b/.test(q)) {
      return this.reply({ text: 'You can reach the store at support@shopease.com or +1 (756)-0000000. Meanwhile I can still search products, prices and orders for you.' });
    }
    if (q === 'help' || /\bhelp\b/.test(q) && q.length < 20) {
      return this.reply({
        text: 'I can: search products ("find mascara"), compare prices ("price of iPhone 6"), show deals, new arrivals and best sellers, list categories, and explain cart, checkout, login and orders. Try one!',
        actions: VIEW_ACTIONS,
      });
    }

    // Generic product search (triggers + bare product queries)
    const term = extractSearchTerm(q);
    if (term) {
      return this.searchReply(term, (top, total) =>
        total > 1
          ? `I found ${total} matches for "${term}". Here are the top picks:`
          : `Here is what I found for "${term}":`
      );
    }

    // Fallback
    return this.reply({
      text: 'I am not sure I understood. Try asking for a product ("red lipstick"), a category list, deals, or help with cart and orders.',
      actions: [
        { label: 'Browse categories', kind: 'search', value: 'categories' },
        ...VIEW_ACTIONS.slice(0, 2),
      ],
    });
  }

  /** Search the live catalog and render product cards. */
  private searchReply(term: string, makeText: (top: Product, total: number) => string): Observable<BotReply> {
    return this.http.get<ProductsResponse>(`${BASE}/search?q=${encodeURIComponent(term)}&limit=5`).pipe(
      map((res) => {
        const products = res.products ?? [];
        if (products.length === 0) {
          return {
            text: `I could not find anything for "${term}". Try another word, or browse the categories.`,
            actions: [{ label: 'Browse categories', kind: 'search', value: 'categories' }],
          } satisfies BotReply;
        }
        const top = products[0];
        return {
          text: makeText(top, res.total ?? products.length),
          products: products.slice(0, 4),
          actions: [{ label: `More in ${top.category}`, kind: 'category', value: top.category }],
        } satisfies BotReply;
      }),
      catchError(() => of({ text: 'The catalog search is unreachable right now. Please try again in a moment.' } satisfies BotReply)),
      delay(REPLY_DELAY_MS)
    );
  }

  /** Fetch a pool of products once, then rank client-side (deals / new / top / budget). */
  private poolReply(
    intro: string,
    pick: (products: Product[]) => Product[],
    extraActions: ChatAction[] = []
  ): Observable<BotReply> {
    return this.http.get<ProductsResponse>(`${BASE}?limit=60`).pipe(
      map((res) => {
        const products = pick(res.products ?? []);
        if (products.length === 0) {
          return { text: 'I could not build that list right now. Please try again.' } satisfies BotReply;
        }
        return { text: intro, products: products.slice(0, 5), actions: extraActions } satisfies BotReply;
      }),
      catchError(() => of({ text: 'The catalog is unreachable right now. Please try again in a moment.' } satisfies BotReply)),
      delay(REPLY_DELAY_MS)
    );
  }

  private categoryListReply(): Observable<BotReply> {
    return this.http.get<ProductCategory[]>(`${BASE}/categories`).pipe(
      map((cats) => {
        if (!cats || cats.length === 0) {
          return { text: 'I could not load the categories right now. Please try again.' } satisfies BotReply;
        }
        return {
          text: `We have ${cats.length} categories. Tap one to see its products:`,
          actions: cats.slice(0, 8).map((c) => ({ label: c.name, kind: 'category', value: c.slug }) as ChatAction),
        } satisfies BotReply;
      }),
      catchError(() => of({ text: 'I could not load the categories right now. Please try again.' } satisfies BotReply)),
      delay(REPLY_DELAY_MS)
    );
  }

  /** Products of one category (used by category chips). */
  browseCategory(slug: string, name?: string): Observable<BotReply> {
    return this.http.get<ProductsResponse>(`${BASE}/category/${encodeURIComponent(slug)}?limit=5`).pipe(
      map((res) => {
        const products = res.products ?? [];
        if (products.length === 0) {
          return { text: `No products found in "${name ?? slug}" right now.` } satisfies BotReply;
        }
        return {
          text: `Top picks in ${name ?? products[0].category}:`,
          products: products.slice(0, 4),
        } satisfies BotReply;
      }),
      catchError(() => of({ text: 'The catalog is unreachable right now. Please try again in a moment.' } satisfies BotReply)),
      delay(REPLY_DELAY_MS)
    );
  }

  private reply(r: BotReply): Observable<BotReply> {
    return of(r).pipe(delay(REPLY_DELAY_MS));
  }
}
