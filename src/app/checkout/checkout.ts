import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProductService } from '../services/product.service';
import { AuthService } from '../services/auth.service';
import { buildOrder, saveOrder, type PlacedOrder } from '../services/orders.store';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './checkout.html',
})
export class Checkout {
  readonly productService = inject(ProductService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Shipping form (mock checkout — no payment API available)
  readonly fullName = signal('');
  readonly address = signal('');
  readonly city = signal('');
  readonly zip = signal('');
  readonly cardNumber = signal('');
  readonly formError = signal<string | null>(null);
  readonly isPlacing = signal(false);
  readonly placedOrder = signal<PlacedOrder | null>(null);

  constructor() {
    const user = this.auth.currentUser();
    if (user) this.fullName.set(user.name);
  }

  placeOrder(): void {
    this.formError.set(null);
    if (!this.fullName().trim() || !this.address().trim() || !this.city().trim() || !this.zip().trim()) {
      this.formError.set('Please fill in your full name and shipping address.');
      return;
    }
    if (!/^\d{12,19}$/.test(this.cardNumber().replace(/\s/g, ''))) {
      this.formError.set('Enter a valid 12–19 digit card number (demo checkout, nothing is charged).');
      return;
    }
    if (this.productService.cartItems().length === 0) {
      this.formError.set('Your cart is empty.');
      return;
    }
    const user = this.auth.currentUser();
    if (!user) {
      this.auth.requireLogin('/checkout');
      return;
    }
    this.isPlacing.set(true);
    const order = buildOrder(
      user.email,
      this.fullName().trim(),
      this.address().trim(),
      this.city().trim(),
      this.zip().trim(),
      this.productService.cartItems(),
      this.productService.subtotal(),
      this.productService.shipping(),
      this.productService.total()
    );
    saveOrder(order);
    // Empty the cart after a successful order.
    for (const item of this.productService.cartItems()) {
      this.productService.removeFromCart(item.id);
    }
    this.placedOrder.set(order);
    this.isPlacing.set(false);
  }

  continueShopping(): void {
    this.productService.clearShopFilter();
    this.router.navigate(['/']);
  }
}
