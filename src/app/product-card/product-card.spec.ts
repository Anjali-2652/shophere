import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';

import { ProductCard } from './product-card';
import type { Product } from '../services/product.service';

const MOCK_PRODUCT: Product = {
  id: 1,
  title: 'Test Product',
  description: 'A product for tests',
  category: 'beauty',
  price: 9.99,
  discountPercentage: 10,
  rating: 4.5,
  stock: 20,
  thumbnail: 't.webp',
};

describe('ProductCard', () => {
  let component: ProductCard;
  let fixture: ComponentFixture<ProductCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCard],
      providers: [
        provideHttpClient(),
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductCard);
    fixture.componentRef.setInput('product', MOCK_PRODUCT);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to /product/:id on openDetails', () => {
    const router = TestBed.inject(Router);
    const spy = vi.spyOn(router, 'navigate');
    component.openDetails();
    expect(spy).toHaveBeenCalledWith(['/product', 1]);
  });
});
