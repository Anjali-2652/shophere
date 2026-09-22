import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './navbar/navbar';
import { HeroSection } from './hero-section/hero-section';
import { ShopByCategory } from './shop-by-category/shop-by-category';
import { FeaturedProducts } from './featured-products/featured-products';
import { PromoBanner } from './promo-banner/promo-banner';
import { Footer } from './footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    Navbar,
    HeroSection,
    ShopByCategory,
    FeaturedProducts,
    PromoBanner,
    Footer,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('ShopEase');
}
