import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';

import { ProductDetails } from './product-details';

const MOCK_PRODUCT = {
  id: 1,
  title: 'Test Product',
  description: 'Full description',
  category: 'beauty',
  price: 9.99,
  discountPercentage: 10,
  rating: 4.5,
  stock: 20,
  thumbnail: 't.webp',
  images: ['t.webp'],
  reviews: [],
};

describe('ProductDetails', () => {
  let component: ProductDetails;
  let fixture: ComponentFixture<ProductDetails>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductDetails],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { url: '/product/1', navigate: () => Promise.resolve(true) } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProductDetails);
    fixture.componentRef.setInput('id', '1');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should load the product by id', async () => {
    const req = httpMock.expectOne((r) => r.url.endsWith('/products/1'));
    req.flush(MOCK_PRODUCT);
    await fixture.whenStable();
    expect(component.product()?.title).toBe('Test Product');
    expect(component.isLoading()).toBe(false);
    // Related-products request fires after the product loads.
    const related = httpMock.expectOne((r) => r.url.includes('/products/category/beauty'));
    related.flush({ products: [], total: 0, skip: 0, limit: 5 });
  });

  it('should show an error when the product is missing', async () => {
    const req = httpMock.expectOne((r) => r.url.endsWith('/products/1'));
    req.flush('Not found', { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    expect(component.error()).toBeTruthy();
    expect(component.isLoading()).toBe(false);
  });
});
