import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '../core/api.service';
import { Loan, PageResponse } from '../core/models';
import { LoansPage } from './loans.page';

describe('LoansPage', () => {
  let http: HttpTestingController;

  const quijote: Loan = {
    id: 1,
    bookId: 1,
    bookTitle: 'El Quijote',
    memberId: 1,
    memberName: 'Miguel Cervantes',
    loanDate: '2026-10-01',
    dueDate: '2026-10-15',
    returnDate: null,
    status: 'ACTIVE',
  };

  const page = (content: Loan[], extra: Partial<PageResponse<Loan>> = {}): PageResponse<Loan> => ({
    content,
    page: 0,
    size: 10,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    ...extra,
  });

  /** Petición GET del historial paginado (con cualquier combinación de parámetros). */
  const isLoansSearch = (r: { method: string; url: string }) =>
    r.method === 'GET' && r.url === `${API_URL}/loans`;

  /** Responde las peticiones auxiliares de la carga: resumen, usuarios y libros. */
  function flushAuxiliary(): void {
    http
      .expectOne(`${API_URL}/loans/summary`)
      .flush({ total: 21, active: 4, overdue: 2, returned: 15 });
    http
      .expectOne(`${API_URL}/members`)
      .flush([{ id: 1, name: 'Miguel Cervantes', email: 'miguel@example.com' }]);
    http
      .expectOne((r) => r.url === `${API_URL}/books`)
      .flush([
        { id: 1, title: 'El Quijote', author: 'Cervantes', genre: 'Clásico', totalCopies: 3, availableCopies: 2, available: true },
      ]);
  }

  async function create(firstPage = page([quijote])): Promise<ComponentFixture<LoansPage>> {
    const fixture = TestBed.createComponent(LoansPage);
    fixture.detectChanges();
    await fixture.whenStable();
    flushAuxiliary();
    http.expectOne(isLoansSearch).flush(firstPage);
    await fixture.whenStable();
    return fixture;
  }

  /** Espera la siguiente búsqueda del historial y la devuelve para inspeccionarla. */
  async function nextSearch(fixture: ComponentFixture<LoansPage>): Promise<TestRequest> {
    fixture.detectChanges();
    await fixture.whenStable();
    return http.expectOne(isLoansSearch);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoansPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide la primera página al servidor con los parámetros por defecto', async () => {
    const fixture = TestBed.createComponent(LoansPage);
    fixture.detectChanges();
    await fixture.whenStable();
    flushAuxiliary();

    const req = http.expectOne(isLoansSearch);
    expect(req.request.params.get('status')).toBe('ALL');
    expect(req.request.params.get('sort')).toBe('dueDate');
    expect(req.request.params.get('direction')).toBe('asc');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.has('q')).toBe(false);
    req.flush(page([quijote]));
  });

  it('lista los préstamos y usa el resumen del servidor para pestañas e indicadores', async () => {
    const fixture = await create();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('El Quijote');
    expect(text).toContain('Miguel Cervantes');
    expect(text).toContain('Todos (21)');
    expect(text).toContain('Vencidos (2)');
    expect(text).toContain('Devueltos (15)');
  });

  it('al cambiar de filtro vuelve a la página 0 y lo envía al servidor', async () => {
    const fixture = await create(page([quijote], { totalElements: 30, totalPages: 3 }));
    fixture.componentInstance.goToPage(2);
    (await nextSearch(fixture)).flush(page([quijote], { page: 2, totalElements: 30, totalPages: 3 }));

    fixture.componentInstance.setStatus('OVERDUE');
    const req = await nextSearch(fixture);
    expect(req.request.params.get('status')).toBe('OVERDUE');
    expect(req.request.params.get('page')).toBe('0');
    req.flush(page([]));
  });

  it('ordena en el servidor al pulsar una cabecera', async () => {
    const fixture = await create();
    fixture.componentInstance.toggleSort('bookTitle');
    const req = await nextSearch(fixture);
    expect(req.request.params.get('sort')).toBe('bookTitle');
    expect(req.request.params.get('direction')).toBe('asc');
    req.flush(page([quijote]));

    fixture.componentInstance.toggleSort('bookTitle');
    expect((await nextSearch(fixture)).request.params.get('direction')).toBe('desc');
  });

  it('busca en el servidor 300 ms después de dejar de escribir', async () => {
    const fixture = await create();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#search-loans')!;
    input.value = 'quij';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    http.expectNone(isLoansSearch); // todavía no: se espera a que deje de escribir

    await new Promise((resolve) => setTimeout(resolve, 350));
    const req = await nextSearch(fixture);
    expect(req.request.params.get('q')).toBe('quij');
    expect(req.request.params.get('page')).toBe('0');
    req.flush(page([quijote]));
  });

  it('muestra el paginador y cambia de tamaño de página', async () => {
    const fixture = await create(page([quijote], { totalElements: 25, totalPages: 3 }));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Mostrando');
    expect(text).toContain('de 25');

    fixture.componentInstance.changePageSize(20);
    const req = await nextSearch(fixture);
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.get('page')).toBe('0');
    req.flush(page([quijote], { size: 20, totalElements: 25, totalPages: 2 }));
  });

  it('no registra préstamo si faltan campos obligatorios', async () => {
    const fixture = await create();
    fixture.componentInstance.lend();
    fixture.detectChanges();

    http.expectNone((r) => r.method === 'POST');
    expect(fixture.componentInstance.form.invalid).toBe(true);
  });

  it('registra el préstamo y recarga la página actual y los contadores', async () => {
    const fixture = await create();
    fixture.componentInstance.form.setValue({ memberId: '1', bookId: '1' });
    fixture.componentInstance.lend();

    const req = http.expectOne((r) => r.method === 'POST' && r.url === `${API_URL}/loans`);
    expect(req.request.body).toEqual({ bookId: 1, memberId: 1 });
    req.flush({ ...quijote, id: 2 });

    flushAuxiliary();
    (await nextSearch(fixture)).flush(page([quijote, { ...quijote, id: 2 }]));
  });
});
