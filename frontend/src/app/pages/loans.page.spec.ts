import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../core/api.service';
import { LoansPage } from './loans.page';

describe('LoansPage', () => {
  let http: HttpTestingController;

  function create() {
    const fixture = TestBed.createComponent(LoansPage);
    fixture.detectChanges();

    http.expectOne(`${API_URL}/loans`).flush([
      {
        id: 1,
        bookId: 1,
        bookTitle: 'El Quijote',
        memberId: 1,
        memberName: 'Miguel Cervantes',
        loanDate: '2026-10-01',
        dueDate: '2026-10-15',
        returnDate: null,
        status: 'ACTIVE',
      },
    ]);
    http
      .expectOne(`${API_URL}/members`)
      .flush([{ id: 1, name: 'Miguel Cervantes', email: 'miguel@example.com' }]);
    http
      .expectOne((r) => r.url === `${API_URL}/books`)
      .flush([
        {
          id: 1,
          title: 'El Quijote',
          author: 'Cervantes',
          genre: 'Clásico',
          totalCopies: 3,
          availableCopies: 2,
          available: true,
        },
      ]);

    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoansPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista los préstamos activos y su información', async () => {
    const fixture = create();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('El Quijote');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Miguel Cervantes');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Activo');
  });

  it('no registra préstamo si faltan campos obligatorios', () => {
    const fixture = create();
    fixture.componentInstance.lend();
    fixture.detectChanges();

    http.expectNone(`${API_URL}/loans`);
    expect(fixture.componentInstance.form.invalid).toBe(true);
  });

  it('permite registrar préstamo con libro y socio', () => {
    const fixture = create();
    fixture.componentInstance.form.setValue({ memberId: '1', bookId: '1' });
    fixture.componentInstance.lend();

    const req = http.expectOne(`${API_URL}/loans`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ bookId: 1, memberId: 1 });
    req.flush({
      id: 2,
      bookId: 1,
      bookTitle: 'El Quijote',
      memberId: 1,
      memberName: 'Miguel Cervantes',
      loanDate: '2026-10-06',
      dueDate: '2026-10-20',
      returnDate: null,
      status: 'ACTIVE',
    });

    http.expectOne(`${API_URL}/loans`).flush([]);
    http.expectOne(`${API_URL}/members`).flush([]);
    http.expectOne((r) => r.url === `${API_URL}/books`).flush([]);
  });
});
