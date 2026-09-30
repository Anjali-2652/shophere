import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { QuickView } from './quick-view';

describe('QuickView', () => {
  let component: QuickView;
  let fixture: ComponentFixture<QuickView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickView],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    // Drain the ProductService constructor HTTP calls (categories/featured).
    const httpMock = TestBed.inject(HttpTestingController);
    httpMock.match(() => true).forEach((req) => {
      if (req.request.url.includes('/categories')) req.flush([]);
      else req.flush({ products: [], total: 0, skip: 0, limit: 0 });
    });

    fixture = TestBed.createComponent(QuickView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should adjust modal quantity', () => {
    component.incrementQty();
    expect(component.modalQuantity()).toBe(2);
    component.decrementQty();
    component.decrementQty();
    expect(component.modalQuantity()).toBe(1);
  });
});
