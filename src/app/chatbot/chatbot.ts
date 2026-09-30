import { Component, ElementRef, OnInit, effect, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatbotService, type BotReply, type ChatAction } from '../services/chatbot.service';
import { Product, ProductService } from '../services/product.service';
import { AuthService } from '../services/auth.service';

export interface ChatMessage {
  id: number;
  from: 'user' | 'bot';
  text: string;
  products?: Product[];
  actions?: ChatAction[];
}

const QUICK_CHIPS = [
  'Show me deals',
  'What categories do you have?',
  'Best sellers',
  'How do I checkout?',
];

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css',
})
export class Chatbot implements OnInit {
  private readonly chat = inject(ChatbotService);
  private readonly products = inject(ProductService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly scrollBox = viewChild<ElementRef<HTMLElement>>('scrollBox');

  readonly isOpen = signal(false);
  readonly showTeaser = signal(false);
  readonly input = signal('');
  readonly isTyping = signal(false);
  readonly unread = signal(0);
  readonly messages = signal<ChatMessage[]>([]);
  readonly quickChips = QUICK_CHIPS;

  private nextId = 1;

  constructor() {
    // Keep the latest message in view.
    effect(() => {
      this.messages().length;
      this.isTyping();
      setTimeout(() => this.scrollToBottom(), 60);
    });
  }

  ngOnInit(): void {
    // Friendly nudge a few seconds after arrival (dismissed once chat opens).
    setTimeout(() => {
      if (!this.isOpen() && this.messages().length === 0) this.showTeaser.set(true);
    }, 5000);
  }

  toggle(): void {
    const opening = !this.isOpen();
    this.isOpen.set(opening);
    this.showTeaser.set(false);
    if (opening) {
      this.unread.set(0);
      if (this.messages().length === 0) {
        this.pushBot({
          text: 'Hi! Looking for something? Ask me for a product, deals, or help with your cart and orders.',
          actions: [
            { label: 'Show deals', kind: 'view', value: 'deals' },
            { label: 'Browse categories', kind: 'search', value: 'categories' },
          ],
        });
      }
    }
  }

  close(): void {
    this.isOpen.set(false);
  }

  sendText(text: string): void {
    const q = text.trim();
    if (!q || this.isTyping()) return;
    this.showTeaser.set(false);
    this.messages.update((m) => [...m, { id: this.nextId++, from: 'user', text: q }]);
    this.input.set('');
    this.isTyping.set(true);
    this.chat.ask(q).subscribe((reply) => {
      this.isTyping.set(false);
      this.pushBot(reply);
    });
  }

  onSubmit(): void {
    this.sendText(this.input());
  }

  onAction(action: ChatAction): void {
    switch (action.kind) {
      case 'route':
        this.close();
        this.router.navigate([action.value]);
        break;
      case 'view':
        this.close();
        this.router.navigate([this.viewRoute(action.value)]);
        break;
      case 'category':
        this.close();
        this.router.navigate(['/category', action.value]);
        break;
      case 'search':
        this.sendText(action.value);
        break;
    }
  }

  addToCart(product: Product, event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.auth.isAuthenticated()) {
      // ProductService redirects guests to /login — close the panel so it is visible.
      this.close();
      this.products.addToCart(product);
      return;
    }
    this.products.addToCart(product);
    this.pushBot({ text: `Added "${product.title}" to your cart.` });
  }

  viewProduct(product: Product): void {
    // Full routed details page: /product/:id
    this.router.navigate(['/product', product.id]);
  }

  private viewRoute(mode: string): string {
    if (mode === 'new') return '/new-arrivals';
    if (mode === 'top') return '/best-sellers';
    return '/deals';
  }

  private pushBot(reply: BotReply): void {
    this.messages.update((m) => [...m, { id: this.nextId++, from: 'bot', ...reply }]);
    if (!this.isOpen()) this.unread.update((n) => n + 1);
  }

  private scrollToBottom(): void {
    const el = this.scrollBox()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
