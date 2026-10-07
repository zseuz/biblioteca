import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../core/api.service';
import { StatsPage } from './stats.page';

describe('StatsPage', () => {
  let http: HttpTestingController;

  function create() {
    const fixture = TestBed.createComponent(StatsPage);
    fixture.detectChanges();

    http.expectOne(`${API_URL}/stats`).flush({
      totalBooks: 42,
      totalMembers: 15,
      activeLoans: 7,
      overdueLoans: 2,
      returnedLoans: 30,
      loansByMonth: [
        { label: '2026-05', count: 4 },
        { label: '2026-06', count: 0 },
        { label: '2026-07', count: 6 },
        { label: '2026-08', count: 3 },
        { label: '2026-09', count: 8 },
        { label: '2026-10', count: 5 },
      ],
      topBooks: [{ label: 'Cien años de soledad', count: 12 }],
      loansByGenre: [{ label: 'Ficción', count: 20 }],
      topMembers: [{ label: 'Ana Martínez', count: 5 }],
    });

    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatsPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('renderiza las métricas principales de estadísticas', async () => {
    const fixture = create();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('42');
    expect(text).toContain('15');
    expect(text).toContain('7');
    expect(text).toContain('2');
    expect(text).toContain('Cien años de soledad');
    expect(text).toContain('Ficción');
    expect(text).toContain('Ana Martínez');
  });

  it('«Préstamos activos» y «Activos al día» muestran el mismo número (los vencidos van aparte)', async () => {
    const fixture = create();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const kpi = Array.from(root.querySelectorAll('.kpi-card')).find((c) => c.textContent?.includes('Préstamos activos'));
    expect(kpi?.querySelector('.kpi-val')?.textContent?.trim()).toBe('7');
    expect(root.textContent).toMatch(/Activos al día\s*7/);
  });


  it('sin datos lo informa en el panel y en cada gráfica', async () => {
    const fixture = TestBed.createComponent(StatsPage);
    fixture.detectChanges();
    http.expectOne(`${API_URL}/stats`).flush({
      totalBooks: 0,
      totalMembers: 0,
      activeLoans: 0,
      overdueLoans: 0,
      returnedLoans: 0,
      loansByMonth: ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'].map((label) => ({ label, count: 0 })),
      topBooks: [],
      loansByGenre: [],
      topMembers: [],
    });
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Aún no hay datos registrados');
    expect(text).toContain('No hay préstamos registrados en los últimos 6 meses');
    expect(text).toContain('Aún no se ha registrado ningún préstamo');
  });

  it('si el servidor no responde, lo dice y permite reintentar', async () => {
    const fixture = TestBed.createComponent(StatsPage);
    fixture.detectChanges();
    http.expectOne(`${API_URL}/stats`).error(new ProgressEvent('error'));
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No se pudieron cargar las estadísticas');
  });

});
