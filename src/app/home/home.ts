import { Component } from '@angular/core';
import { HeroSection } from '../hero-section/hero-section';
import { ShopByCategory } from '../shop-by-category/shop-by-category';
import { FeaturedProducts } from '../featured-products/featured-products';
import { PromoBanner } from '../promo-banner/promo-banner';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HeroSection, ShopByCategory, FeaturedProducts, PromoBanner],
  template: `
    <app-hero-section></app-hero-section>
    <app-shop-by-category></app-shop-by-category>
    <app-featured-products></app-featured-products>
    <app-promo-banner></app-promo-banner>
  `,
})
export class Home {}
