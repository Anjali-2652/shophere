import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { ChatbotService } from './chatbot.service';

describe('ChatbotService', () => {
  let service: ChatbotService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ChatbotService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should greet the user', async () => {
    const reply = await firstValueFrom(service.ask('hello'));
    expect(reply.text).toMatch(/hello/i);
    expect(reply.actions?.length).toBeGreaterThan(0);
  });

  it('should explain login when asked', async () => {
    const reply = await firstValueFrom(service.ask('how do I login?'));
    expect(reply.text).toMatch(/login/i);
    expect(reply.actions?.some((a) => a.value === '/login')).toBe(true);
  });

  it('should search the live catalog for a product term', async () => {
    const promise = firstValueFrom(service.ask('find mascara'));
    const req = httpMock.expectOne((r) => r.url.includes('/products/search') && r.url.includes('mascara'));
    expect(req.request.method).toBe('GET');
    req.flush({
      products: [
        { id: 1, title: 'Essence Mascara', price: 9.99, rating: 4.5, category: 'beauty', thumbnail: 't.webp', discountPercentage: 5, stock: 10 },
      ],
      total: 1,
      skip: 0,
      limit: 5,
    });
    const reply = await promise;
    expect(reply.products?.length).toBe(1);
    expect(reply.products?.[0].title).toBe('Essence Mascara');
  });

  it('should handle an unknown product search gracefully', async () => {
    const promise = firstValueFrom(service.ask('xyzzy wobble quark'));
    const req = httpMock.expectOne((r) => r.url.includes('/products/search'));
    req.flush({ products: [], total: 0, skip: 0, limit: 5 });
    const reply = await promise;
    expect(reply.text).toMatch(/could not find/i);
    expect(reply.actions?.length).toBeGreaterThan(0);
  });
});
