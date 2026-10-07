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

  describe('préstamo rápido de un libro que el usuario ya tiene', () => {
    const existingLoan = {
      id: 7,
      bookId: 1,
      bookTitle: 'Dune',
      memberId: 1,
      memberName: 'Ana Torres',
      loanDate: '2026-10-01',
      dueDate: '2026-10-15',
      returnDate: null,
      status: 'ACTIVE',
    };
    const quickLoanText = 'Préstamo del libro: Dune'; // subtítulo de la ventana de préstamo
    const repeatText = 'Este usuario ya tiene el libro';

    async function requestSameBook() {
      const fixture = create();
      fixture.componentInstance.openQuickLoan(dune);
      http
        .expectOne(`${API_URL}/members`)
        .flush([{ id: 1, name: 'Ana Torres', email: 'ana@example.com', activeLoans: 1, totalLoans: 1 }]);
      fixture.componentInstance.quickLoanMember.setValue(1);
      fixture.componentInstance.submitQuickLoan();
      http.expectOne((r) => r.url === `${API_URL}/loans/active`).flush([existingLoan]);
      await fixture.whenStable();
      return fixture;
    }

    it('muestra solo el aviso: la ventana de préstamo se oculta en lugar de quedar detrás', async () => {
      const fixture = await requestSameBook();
      const text = document.body.textContent ?? '';

      expect(text).toContain(repeatText);
      expect(text).not.toContain(quickLoanText);
      expect(fixture.componentInstance.quickLoanModalOpen()).toBe(true); // se conserva, solo está oculta
    });

    it('al cancelar el aviso vuelve la ventana de préstamo con el usuario elegido', async () => {
      const fixture = await requestSameBook();

      fixture.componentInstance.repeat.set(null);
      await fixture.whenStable();

      const text = document.body.textContent ?? '';
      expect(text).toContain(quickLoanText);
      expect(text).not.toContain(repeatText);
      expect(fixture.componentInstance.quickLoanMember.value).toBe(1);
    });
  });

  describe('género literario', () => {
    const genreInput = () => document.querySelector<HTMLInputElement>('input#genre');

    it('es un campo de selección que sugiere géneros y los que ya tienen los libros', async () => {
      const fixture = create();
      fixture.componentInstance.openCreate();
      await fixture.whenStable();

      const options = fixture.componentInstance.genreOptions().map((o) => o.label);
      expect(options).toEqual(expect.arrayContaining(['Novela', 'Terror', 'Ciencia ficción']));
      expect(genreInput()?.getAttribute('role')).toBe('combobox');
      expect(genreInput()?.getAttribute('maxlength')).toBe('80');
    });

    it('admite escribir un género nuevo y lo envía al crear el libro', async () => {
      const fixture = create();
      fixture.componentInstance.openCreate();
      await fixture.whenStable();

      const input = genreInput()!;
      input.value = 'Realismo sucio';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new FocusEvent('blur'));
      await fixture.whenStable();
      expect(fixture.componentInstance.form.getRawValue().genre).toBe('Realismo sucio');

      fixture.componentInstance.form.patchValue({ title: 'Cien poemas', author: 'Alguien', totalCopies: 1 });
      fixture.componentInstance.save();
      const check = http.expectOne(isDuplicateCheck);
      expect(check.request.params.get('genre')).toBe('Realismo sucio');
      check.flush({ sameBook: null, differentGenre: [] });
      http.expectOne((r) => r.method === 'POST' && r.url === `${API_URL}/books`).flush({});
      http.expectOne(isList).flush([]);
    });

    it('al editar muestra el género del libro, aunque no esté en las sugerencias', async () => {
      const fixture = create();
      const cyber = { ...dune, id: 2, title: 'Neuromante', genre: 'Cyberpunk' };
      fixture.componentInstance.edit(cyber);
      await fixture.whenStable();

      expect(genreInput()?.value).toBe('Cyberpunk');
    });
  });


  describe('búsqueda sin resultados', () => {
    it('dice «Sin resultados», no que el catálogo está vacío', async () => {
      const fixture = create();
      fixture.componentInstance.onSearch('zzzz');
      await new Promise((r) => setTimeout(r, 300)); // espera del buscador (250 ms)
      http.expectOne((r) => isList(r) || (r.method === 'GET' && r.url === `${API_URL}/books`)).flush([]);
      await fixture.whenStable();

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Sin resultados');
      expect(text).not.toContain('El catálogo está actualmente vacío');
    });

    it('con el catálogo realmente vacío sí invita a agregar el primer libro', async () => {
      const fixture = TestBed.createComponent(BooksPage);
      fixture.detectChanges();
      http.expectOne(isList).flush([]);
      await fixture.whenStable();

      expect((fixture.nativeElement as HTMLElement).textContent).toContain('El catálogo está actualmente vacío');
    });
  });

});
