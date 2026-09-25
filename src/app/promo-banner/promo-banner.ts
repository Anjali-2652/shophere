import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-promo-banner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './promo-banner.html',
  styleUrl: './promo-banner.css',
})
export class PromoBanner implements OnInit, OnDestroy {
  readonly productService = inject(ProductService);

  // Countdown timer state
  readonly hours = signal(23);
  readonly minutes = signal(45);
  readonly seconds = signal(18);
  private timerInterval?: ReturnType<typeof setInterval>;

  // Copy code state
  readonly copied = signal(false);

  // Newsletter email state
  readonly newsletterEmail = signal('');
  readonly subscribed = signal(false);

  ngOnInit(): void {
    this.timerInterval = setInterval(() => {
      if (this.seconds() > 0) {
        this.seconds.update((s) => s - 1);
      } else if (this.minutes() > 0) {
        this.minutes.update((m) => m - 1);
        this.seconds.set(59);
      } else if (this.hours() > 0) {
        this.hours.update((h) => h - 1);
        this.minutes.set(59);
        this.seconds.set(59);
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  copyCode(): void {
    navigator.clipboard?.writeText('WELCOME10');
    this.copied.set(true);
    setTimeout(() => {
      this.copied.set(false);
    }, 2500);
  }

  onSubscribe(): void {
    if (this.newsletterEmail().trim() && this.newsletterEmail().includes('@')) {
      this.subscribed.set(true);
      this.newsletterEmail.set('');
      setTimeout(() => {
        this.subscribed.set(false);
      }, 5000);
    }
  }

  scrollToFeatured(): void {
    document
      .getElementById('featured-products')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
