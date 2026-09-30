import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';

import { Catalog } from './catalog';

const MOCK_PRODUCTS = {
  products: [
    { id: 1, title: 'A', description: 'd', category: 'beauty', price: 10, discountPercentage: 5, rating: 4, stock: 5, thumbnail: 't.webp' },
    { id: 2, title: 'B', description: 'd', category: 'beauty', price: 20, discountPercentage: 15, rating: 4.8, stock: 5, thumbnail: 't.webp' },
  ],
  total: 2,
  skip: 0,
  limit: 24,
};

describe('Catalog', () => {
  let component: Catalog;
  let fixture: ComponentFixture<Catalog>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Catalog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { url: '/category/beauty', navigate: () => Promise.resolve(true) } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Catalog);
    fixture.componentRef.setInput('slug', 'beauty');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should load category products', async () => {
    const req = httpMock.expectOne((r) => r.url.includes('/products/category/beauty'));
    req.flush(MOCK_PRODUCTS);
    await fixture.whenStable();
    expect(component.products().length).toBe(2);
    expect(component.isLoading()).toBe(false);
  });
});
