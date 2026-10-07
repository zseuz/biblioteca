import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../core/api.service';
import { Book } from '../core/models';
import { BooksPage } from './books.page';

describe('BooksPage', () => {
  let http: HttpTestingController;

  const dune: Book = {
    id: 1,
    title: 'Dune',
    author: 'Frank Herbert',
    genre: 'Ciencia ficción',
    totalCopies: 2,
    availableCopies: 1,
    available: true,
  };

  const isList = (r: { method: string; url: string }) => r.method === 'GET' && r.url === `${API_URL}/books`;
  const isDuplicateCheck = (r: { url: string }) => r.url === `${API_URL}/books/duplicates`;

  function create() {
    const fixture = TestBed.createComponent(BooksPage);
    fixture.detectChanges();
    http.expectOne(isList).flush([dune]);
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

    http.expectNone(isDuplicateCheck);
    http.expectNone((r) => r.method === 'POST');
    expect(fixture.componentInstance.form.invalid).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('El título es obligatorio.');
  });

  it('comprueba duplicados y, si no hay, crea el libro', () => {
    const fixture = create();
    fixture.componentInstance.openCreate();
    fixture.componentInstance.form.setValue({ title: 'Sapiens', author: 'Harari', genre: 'Historia', totalCopies: 1 });
    fixture.componentInstance.save();

    const check = http.expectOne(isDuplicateCheck);
    expect(check.request.params.get('title')).toBe('Sapiens');
    expect(check.request.params.get('author')).toBe('Harari');
    expect(check.request.params.get('genre')).toBe('Historia');
    check.flush({ sameBook: null, differentGenre: [] });

    const req = http.expectOne((r) => r.method === 'POST' && r.url === `${API_URL}/books`);
    expect(req.request.body.title).toBe('Sapiens');
    req.flush({});
    http.expectOne(isList).flush([]);
  });

  it('si el libro ya existe, ofrece sumar los ejemplares en vez de duplicarlo', async () => {
    const fixture = create();
    fixture.componentInstance.openCreate();
    fixture.componentInstance.form.setValue({ title: 'dune', author: 'frank herbert', genre: 'ciencia ficción', totalCopies: 3 });
    fixture.componentInstance.save();
    http.expectOne(isDuplicateCheck).flush({ sameBook: dune, differentGenre: [] });
    await fixture.whenStable();

    const text = document.body.textContent ?? '';
    expect(text).toContain('Este libro ya está registrado');
    expect(text).toContain('quedará con'); // 2 + 3 = 5
    expect(document.body.textContent).toContain('Añadir 3 ejemplares');
    http.expectNone((r) => r.method === 'POST' && r.url === `${API_URL}/books`); // no se crea otro

    fixture.componentInstance.addToExisting();
    const add = http.expectOne(`${API_URL}/books/1/copies`);
    expect(add.request.method).toBe('POST');
    expect(add.request.body).toEqual({ quantity: 3 });
    add.flush({ ...dune, totalCopies: 5, availableCopies: 4 });
    http.expectOne(isList).flush([{ ...dune, totalCopies: 5, availableCopies: 4 }]);

    expect(fixture.componentInstance.duplicate()).toBeNull();
    expect(fixture.componentInstance.isModalOpen()).toBe(false);
  });

  it('si solo cambia el género, muestra la diferencia y crea al confirmar', async () => {
    const fixture = create();
    fixture.componentInstance.openCreate();
    fixture.componentInstance.form.setValue({ title: 'Dune', author: 'Frank Herbert', genre: 'Novela', totalCopies: 1 });
    fixture.componentInstance.save();
    http.expectOne(isDuplicateCheck).flush({ sameBook: null, differentGenre: [dune] });
    await fixture.whenStable();

    const text = document.body.textContent ?? '';
    expect(text).toContain('Ya existe con otro género');
    expect(text).toContain('Ciencia ficción'); // registrado
    expect(text).toContain('Novela'); // nuevo
    expect(text).toContain('Diferente');

    fixture.componentInstance.confirmNewGenre();
    const req = http.expectOne((r) => r.method === 'POST' && r.url === `${API_URL}/books`);
    expect(req.request.body.genre).toBe('Novela');
    req.flush({});
    http.expectOne(isList).flush([]);
  });

  it('al eliminar, el título del libro aparece en negrita', async () => {
    const fixture = create();
    fixture.componentInstance.remove(dune);
    await fixture.whenStable();

    const message = document.querySelector('.confirm-message');
    expect(message?.textContent).toContain('¿Estás seguro de que deseas eliminar Dune?');
    expect(message?.querySelector('strong')?.textContent).toBe('Dune');
    fixture.componentInstance.cancelDelete();
  });

  it('volver al formulario conserva lo escrito y no guarda nada', async () => {
    const fixture = create();
    fixture.componentInstance.openCreate();
    fixture.componentInstance.form.setValue({ title: 'Dune', author: 'Frank Herbert', genre: 'Novela', totalCopies: 1 });
    fixture.componentInstance.save();
    http.expectOne(isDuplicateCheck).flush({ sameBook: null, differentGenre: [dune] });

    fixture.componentInstance.backToForm();

    expect(fixture.componentInstance.duplicate()).toBeNull();
    expect(fixture.componentInstance.isModalOpen()).toBe(true);
    expect(fixture.componentInstance.form.getRawValue().genre).toBe('Novela');
    http.expectNone((r) => r.method === 'POST');
  });
});
