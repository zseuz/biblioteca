import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../core/api.service';
import { BooksPage } from './books.page';

describe('BooksPage', () => {
  let http: HttpTestingController;

  function create() {
    const fixture = TestBed.createComponent(BooksPage);
    fixture.detectChanges();
    http.expectOne(r => r.url === `${API_URL}/books`).flush([
      { id: 1, title: 'Dune', author: 'Frank Herbert', genre: 'Ciencia ficción', totalCopies: 2, availableCopies: 1, available: true },
    ]);
    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BooksPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista los libros que devuelve la API', async () => {
    const fixture = create();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Dune');
  });

  it('no envía el formulario si hay campos obligatorios vacíos', () => {
    const fixture = create();
    fixture.componentInstance.save();
    fixture.detectChanges();

    http.expectNone(`${API_URL}/books`);
    expect(fixture.componentInstance.form.invalid).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('El título es obligatorio.');
  });

  it('crea el libro cuando el formulario es válido', () => {
    const fixture = create();
    fixture.componentInstance.form.setValue({ title: 'Sapiens', author: 'Harari', genre: 'Historia', totalCopies: 1 });
    fixture.componentInstance.save();

    const req = http.expectOne(`${API_URL}/books`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.title).toBe('Sapiens');
    req.flush({});
    http.expectOne(r => r.url === `${API_URL}/books`).flush([]);
  });
});
