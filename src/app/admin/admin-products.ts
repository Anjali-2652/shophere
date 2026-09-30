import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CustomProductInput, Product, ProductService } from '../services/product.service';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-products.html',
})
export class AdminProducts {
  readonly productService = inject(ProductService);

  // Store-added products (full CRUD)
  readonly customs = this.productService.customProducts;
  readonly searchFilter = signal('');

  readonly filteredCustoms = computed(() => {
    const q = this.searchFilter().toLowerCase().trim();
    if (!q) return this.customs();
    return this.customs().filter(
      (p) => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  });

  // Live catalog browser (read-only — DummyJSON is a shared demo API)
  readonly liveQuery = signal('');
  readonly liveResults = signal<Product[]>([]);
  readonly isSearchingLive = signal(false);

  // Add / edit form
  readonly isFormOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly formError = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  readonly fTitle = signal('');
  readonly fCategory = signal('');
  readonly fPrice = signal<number | null>(null);
  readonly fDiscount = signal(0);
  readonly fStock = signal(10);
  readonly fBrand = signal('');
  readonly fImage = signal('');
  readonly fDescription = signal('');

  // Delete confirm
  readonly deleteTarget = signal<Product | null>(null);

  searchLive(): void {
    const q = this.liveQuery().trim();
    if (!q) {
      this.liveResults.set([]);
      return;
    }
    this.isSearchingLive.set(true);
    this.productService.searchProducts(q, 6).subscribe({
      next: (res) => {
        this.liveResults.set(res.products ?? []);
        this.isSearchingLive.set(false);
      },
      error: () => {
        this.liveResults.set([]);
        this.isSearchingLive.set(false);
      },
    });
  }

  openAdd(): void {
    this.editingId.set(null);
    this.fTitle.set('');
    this.fCategory.set(this.productService.categories()[0]?.slug ?? '');
    this.fPrice.set(null);
    this.fDiscount.set(0);
    this.fStock.set(10);
    this.fBrand.set('');
    this.fImage.set('');
    this.fDescription.set('');
    this.formError.set(null);
    this.isFormOpen.set(true);
  }

  openEdit(p: Product): void {
    this.editingId.set(p.id);
    this.fTitle.set(p.title);
    this.fCategory.set(p.category);
    this.fPrice.set(p.price);
    this.fDiscount.set(p.discountPercentage);
    this.fStock.set(p.stock);
    this.fBrand.set(p.brand ?? '');
    this.fImage.set(p.thumbnail);
    this.fDescription.set(p.description);
    this.formError.set(null);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.editingId.set(null);
    this.formError.set(null);
  }

  onImageFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.formError.set('Please choose an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => this.fImage.set(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  }

  save(): void {
    this.formError.set(null);
    if (!this.fTitle().trim()) return this.fail('Product title is required.');
    if (!this.fCategory()) return this.fail('Choose a category.');
    if (this.fPrice() === null || Number.isNaN(this.fPrice()) || (this.fPrice() as number) <= 0) {
      return this.fail('Enter a valid price greater than 0.');
    }
    if (!this.fImage().trim()) return this.fail('Add an image URL or upload an image.');
    if (!this.fDescription().trim()) return this.fail('Product description is required.');

    const payload: CustomProductInput = {
      title: this.fTitle(),
      description: this.fDescription(),
      category: this.fCategory(),
      price: Number(this.fPrice()),
      discountPercentage: Math.min(90, Math.max(0, Number(this.fDiscount() || 0))),
      rating: 4.5,
      stock: Math.max(0, Math.floor(Number(this.fStock() || 0))),
      brand: this.fBrand(),
      thumbnail: this.fImage(),
    };

    const id = this.editingId();
    if (id === null) {
      const created = this.productService.addCustomProduct(payload);
      this.flash(`"${created.title}" added to the store.`);
    } else {
      if (!this.productService.updateCustomProduct(id, payload)) {
        return this.fail('Could not update — product not found.');
      }
      this.flash('Product updated.');
    }
    this.closeForm();
  }

  askDelete(p: Product): void {
    this.deleteTarget.set(p);
  }

  confirmDelete(): void {
    const p = this.deleteTarget();
    if (p) {
      this.productService.deleteCustomProduct(p.id);
      this.flash(`"${p.title}" deleted.`);
    }
    this.deleteTarget.set(null);
  }

  private fail(msg: string): void {
    this.formError.set(msg);
  }

  private flash(msg: string): void {
    this.notice.set(msg);
    setTimeout(() => this.notice.set(null), 3000);
  }
}
