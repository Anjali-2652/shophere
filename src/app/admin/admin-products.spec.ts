import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AdminProducts } from './admin-products';
import { ProductService } from '../services/product.service';

describe('AdminProducts', () => {
  let component: AdminProducts;
  let fixture: ComponentFixture<AdminProducts>;
  let products: ProductService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AdminProducts],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { url: '/admin/products', navigate: () => Promise.resolve(true) } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
      ],
    }).compileComponents();

    products = TestBed.inject(ProductService);
    fixture = TestBed.createComponent(AdminProducts);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add, update and delete a store product (localStorage)', () => {
    const created = products.addCustomProduct({
      title: 'Test Mug',
      description: 'A mug for tests',
      category: 'groceries',
      price: 12.5,
      stock: 7,
      thumbnail: 'https://example.com/mug.png',
    });
    expect(products.customProducts().length).toBe(1);
    expect(JSON.parse(localStorage.getItem('shopease_custom_products') ?? '[]').length).toBe(1);

    expect(products.updateCustomProduct(created.id, { price: 15 })).toBe(true);
    expect(products.customProducts()[0].price).toBe(15);

    expect(products.deleteCustomProduct(created.id)).toBe(true);
    expect(products.customProducts().length).toBe(0);
  });

  it('should resolve an admin-added product via getProduct', async () => {
    const created = products.addCustomProduct({
      title: 'Local Find',
      description: 'd',
      category: 'beauty',
      price: 5,
      thumbnail: 'https://example.com/x.png',
    });
    const p = await firstValueFrom(products.getProduct(created.id));
    expect(p.title).toBe('Local Find');
  });
});
