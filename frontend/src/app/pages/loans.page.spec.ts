import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_URL } from '../core/api.service';
import { NotifyService } from '../core/notify.service';
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
    expect(req.request.params.get('sort')).toBe('loanDate'); // los más recientes primero
    expect(req.request.params.get('direction')).toBe('desc');
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

  it('al ordenar por una fecha empieza por la más reciente', async () => {
    const fixture = await create();
    fixture.componentInstance.toggleSort('dueDate');
    const req = await nextSearch(fixture);
    expect(req.request.params.get('sort')).toBe('dueDate');
    expect(req.request.params.get('direction')).toBe('desc');
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

  it('el libro se elige con un buscador que filtra por título o autor', async () => {
    const fixture = await create();
    fixture.componentInstance.openCreateModal();
    await fixture.whenStable();

    const input = document.getElementById('book') as HTMLInputElement;
    expect(input.getAttribute('role')).toBe('combobox');

    // Al escribir el autor aparece el libro, con sus ejemplares disponibles.
    input.value = 'cervantes';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    const options = Array.from(document.querySelectorAll('.combo-list [role="option"]'));
    expect(options.map((o) => o.querySelector('.combo-label')?.textContent?.trim())).toEqual(['El Quijote']);
    expect(options[0].querySelector('.combo-desc')?.textContent).toContain('2 disponibles');

    (options[0] as HTMLElement).click();
    await fixture.whenStable();
    expect(fixture.componentInstance.form.controls.bookId.value).toBe('1');
    expect(input.value).toBe('El Quijote');

    fixture.componentInstance.closeModal();
  });

  it('no registra préstamo si faltan campos obligatorios', async () => {
    const fixture = await create();
    fixture.componentInstance.lend();
    fixture.detectChanges();

    http.expectNone((r) => r.method === 'POST');
    expect(fixture.componentInstance.form.invalid).toBe(true);
  });

  const isActiveCheck = (r: { url: string }) => r.url === `${API_URL}/loans/active`;

  it('registra el préstamo (tras comprobar que no lo tiene ya) y recarga la página', async () => {
    const fixture = await create();
    fixture.componentInstance.form.setValue({ memberId: '1', bookId: '1' });
    fixture.componentInstance.lend();

    const check = http.expectOne(isActiveCheck);
    expect(check.request.params.get('memberId')).toBe('1');
    expect(check.request.params.get('bookId')).toBe('1');
    check.flush([]);

    const req = http.expectOne((r) => r.method === 'POST' && r.url === `${API_URL}/loans`);
    expect(req.request.body).toEqual({ bookId: 1, memberId: 1 });
    req.flush({ ...quijote, id: 2 });
    expect(TestBed.inject(NotifyService).notice()?.text).toContain('vence el 15/10/2026'); // no 2026-10-15

    flushAuxiliary();
    (await nextSearch(fixture)).flush(page([quijote, { ...quijote, id: 2 }]));
  });

  describe('préstamo repetido', () => {
    async function requestSameBook(existing: Loan[]) {
      const fixture = await create();
      fixture.componentInstance.openCreateModal();
      fixture.componentInstance.form.setValue({ memberId: '1', bookId: '1' });
      fixture.componentInstance.lend();
      http.expectOne(isActiveCheck).flush(existing);
      await fixture.whenStable();
      return fixture;
    }

    it('avisa desde cuándo lo tiene y, al confirmar, registra otro préstamo', async () => {
      const fixture = await requestSameBook([quijote]);
      const text = document.body.textContent ?? '';
      expect(text).toContain('Este usuario ya tiene el libro');
      expect(text).toContain('desde el');
      expect(text).toContain('01/10/2026'); // fecha del préstamo existente
      http.expectNone((r) => r.method === 'POST'); // aún no se presta

      fixture.componentInstance.confirmRepeatLend();
      http.expectOne((r) => r.method === 'POST' && r.url === `${API_URL}/loans`).flush({ ...quijote, id: 2 });
      flushAuxiliary();
      (await nextSearch(fixture)).flush(page([quijote]));
      expect(fixture.componentInstance.repeat()).toBeNull();
    });

    it('oculta la ventana de préstamo mientras se muestra el aviso y la recupera al cancelar', async () => {
      const fixture = await requestSameBook([quijote]);
      const formText = 'Asigna un ejemplar a un usuario registrado'; // subtítulo de la ventana de préstamo

      expect(document.body.textContent).toContain('Este usuario ya tiene el libro');
      expect(document.body.textContent).not.toContain(formText);

      fixture.componentInstance.repeat.set(null);
      await fixture.whenStable();
      expect(document.body.textContent).toContain(formText);
      expect(fixture.componentInstance.form.getRawValue()).toEqual({ memberId: '1', bookId: '1' });
    });

    it('si el préstamo existente aún no se puede renovar, desactiva «Renovar existente» e indica desde cuándo', async () => {
      const due = new Date();
      due.setDate(due.getDate() + 9);
      const from = new Date();
      from.setDate(from.getDate() + 4);
      const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      await requestSameBook([{ ...quijote, dueDate: iso(due), renewableFrom: iso(from) }]);

      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('app-loan-repeat-dialog .repeat-actions button'));
      const renewButton = buttons.find((b) => b.textContent?.includes('Renovar existente'));
      expect(renewButton?.disabled).toBe(true);
      expect(buttons.find((b) => b.textContent?.includes('Prestar otro ejemplar'))?.disabled).toBe(false);
      const [y, m, d] = iso(from).split('-');
      expect(document.body.textContent).toContain(`podrá renovarse desde el ${d}/${m}/${y}`);
    });

    it('puede renovar el préstamo existente en lugar de prestar otro', async () => {
      const fixture = await requestSameBook([quijote]);

      fixture.componentInstance.renewFromRepeat(quijote);
      const renew = http.expectOne(`${API_URL}/loans/1/renew`);
      expect(renew.request.method).toBe('POST');
      renew.flush({ ...quijote, dueDate: '2026-10-21', renewals: 1 });
      http.expectNone((r) => r.method === 'POST' && r.url === `${API_URL}/loans`);
      flushAuxiliary();
      (await nextSearch(fixture)).flush(page([quijote]));

      expect(TestBed.inject(NotifyService).notice()?.text).toContain('21/10/2026');
      expect(fixture.componentInstance.isModalOpen()).toBe(false);
    });

    it('si el préstamo existente está vencido, solo permite cerrar el aviso', async () => {
      await requestSameBook([{ ...quijote, status: 'OVERDUE' }]);
      const buttons = Array.from(document.querySelectorAll('app-loan-repeat-dialog .repeat-actions button')).map(
        (b) => b.textContent?.trim(),
      );
      expect(buttons).toEqual(['Entendido']);
      expect(document.body.textContent).toContain('debe devolverlo');
    });
  });

  it('renueva desde el menú solo los préstamos en plazo', async () => {
    const fixture = await create();
    const page_ = fixture.componentInstance;
    expect(page_.activeLoanActions.map((a) => a.id)).toEqual(['renew', 'return']);
    expect(page_.overdueLoanActions.map((a) => a.id)).toEqual(['return']);

    page_.onAction('renew', quijote);
    await fixture.whenStable();
    expect(document.querySelector('.confirm-message strong')?.textContent).toBe('El Quijote');

    page_.confirmRenew();
    http.expectOne(`${API_URL}/loans/1/renew`).flush({ ...quijote, dueDate: '2026-10-21', renewals: 1 });
    flushAuxiliary();
    (await nextSearch(fixture)).flush(page([{ ...quijote, renewals: 1 }]));
    expect(page_.loanToRenew()).toBeNull();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Renovado 1 vez');
  });

  describe('historial de renovaciones', () => {
    const todayIso = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    /** Fecha ISO de dentro de {@code days} días (negativo = pasado). */
    const isoIn = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const confirmButtons = () =>
      Array.from(document.querySelectorAll('.confirm-actions button')).map((b) => b.textContent?.trim());

    it('al pulsar «Renovado N vez» muestra el préstamo inicial y cada renovación con su hora', async () => {
      const fixture = await create();
      fixture.componentInstance.openHistory({ ...quijote, renewals: 1 });
      await fixture.whenStable();
      expect(document.body.textContent).toContain('Cargando historial');

      http.expectOne(`${API_URL}/loans/1/renewals`).flush({
        loan: { ...quijote, dueDate: '2026-10-21', renewals: 1 },
        originalDueDate: '2026-10-15',
        unrecordedRenewals: 0,
        renewals: [
          { number: 1, renewedAt: '2026-10-07T10:42:05', previousDueDate: '2026-10-15', newDueDate: '2026-10-21', daysAdded: 6 },
        ],
      });
      await fixture.whenStable();

      const text = document.body.textContent ?? '';
      expect(text).toContain('Préstamo inicial');
      expect(text).toContain('01/10/2026'); // prestado el
      expect(text).toContain('Renovación 1');
      expect(text).toContain('07/10/2026 a las 10:42');
      expect(text).toContain('+6 días');
    });

    it('si faltan más de 5 días, informa desde cuándo se podrá renovar y no llama al servidor', async () => {
      const fixture = await create();
      // Vence en 9 días: se podrá renovar dentro de 4 (cuando falten 5).
      fixture.componentInstance.onAction('renew', { ...quijote, dueDate: isoIn(9), renewableFrom: isoIn(4) });
      await fixture.whenStable();

      const message = document.querySelector('.confirm-message')?.textContent ?? '';
      const [y, m, d] = isoIn(4).split('-');
      expect(message).toContain(`No es posible renovar el préstamo de El Quijote hasta el ${d}/${m}/${y}`);
      expect(message).toContain('faltan 5 días o menos');
      expect(confirmButtons()).toEqual(['Entendido']);
      fixture.componentInstance.confirmRenew();
      http.expectNone((r) => r.url.endsWith('/renew'));
    });

    it('cuando ya faltan 5 días o menos, permite renovar', async () => {
      const fixture = await create();
      fixture.componentInstance.onAction('renew', { ...quijote, dueDate: isoIn(5), renewableFrom: isoIn(0) });
      await fixture.whenStable();

      expect(document.querySelector('.confirm-message')?.textContent).toContain('¿Renovar el préstamo de');
      expect(confirmButtons()).toEqual(['Cancelar', 'Renovar']);
    });

    it('si ya se renovó hoy, además indica a qué hora', async () => {
      const fixture = await create();
      const today = todayIso();
      fixture.componentInstance.onAction('renew', {
        ...quijote,
        dueDate: isoIn(14),
        renewals: 1,
        lastRenewedOn: today,
        lastRenewedAt: `${today}T10:42:05`,
        renewableFrom: isoIn(9),
      });
      await fixture.whenStable();

      const message = document.querySelector('.confirm-message')?.textContent ?? '';
      expect(message).toContain('Ya se renovó hoy a las 10:42');
      expect(message).toContain('No es posible renovar');
      expect(confirmButtons()).toEqual(['Entendido']);
    });

    it('si el servidor rechaza la renovación, el motivo aparece en el diálogo', async () => {
      const fixture = await create();
      fixture.componentInstance.onAction('renew', quijote);
      fixture.componentInstance.confirmRenew();
      http
        .expectOne(`${API_URL}/loans/1/renew`)
        .flush({ message: 'Este préstamo ya se renovó hoy a las 09:15' }, { status: 409, statusText: 'Conflict' });
      await fixture.whenStable();

      expect(document.querySelector('.confirm-error')?.textContent).toContain('a las 09:15');
      expect(TestBed.inject(NotifyService).notice()).toBeNull(); // sin aviso duplicado detrás
    });
  });
});
