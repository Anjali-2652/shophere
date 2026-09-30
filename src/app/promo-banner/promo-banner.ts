import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { saveSubscriber } from '../services/newsletter.store';

@Component({
  selector: 'app-promo-banner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './promo-banner.html',
  styleUrl: './promo-banner.css',
})
export class PromoBanner implements OnInit, OnDestroy {
  private readonly router = inject(Router);

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
  readonly subscribeError = signal<string | null>(null);

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
    const email = this.newsletterEmail().trim();
    if (!email || !email.includes('@')) {
      this.subscribeError.set('Enter a valid email address.');
      return;
    }
    if (saveSubscriber(email)) {
      this.subscribeError.set(null);
      this.subscribed.set(true);
      this.newsletterEmail.set('');
      setTimeout(() => {
        this.subscribed.set(false);
      }, 5000);
    } else {
      this.subscribeError.set('Could not save. Please try again.');
    }
  }

  scrollToFeatured(): void {
    document
      .getElementById('featured-products')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Explore Top Deals → routed deals page. */
  exploreTopDeals(): void {
    this.router.navigate(['/deals']);
  }
}
