import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../core/api.service';
import { MembersPage } from './members.page';

describe('MembersPage', () => {
  let http: HttpTestingController;

  function create() {
    const fixture = TestBed.createComponent(MembersPage);
    fixture.detectChanges();
    http
      .expectOne(`${API_URL}/members`)
      .flush([{ id: 1, name: 'Carlos Mendoza', email: 'carlos@example.com' }]);
    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembersPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista los usuarios registrados', async () => {
    const fixture = create();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Carlos Mendoza');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('carlos@example.com');
  });

  it('no envía el formulario con datos inválidos', () => {
    const fixture = create();
    fixture.componentInstance.save();
    fixture.detectChanges();

    http.expectNone(`${API_URL}/members`);
    expect(fixture.componentInstance.form.invalid).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'El nombre es obligatorio.',
    );
  });

  it('rechaza nombres de más de 100 caracteres (HTML y validador de Angular)', async () => {
    const fixture = create();
    fixture.componentInstance.openCreate();
    await fixture.whenStable();

    const input = document.getElementById('name') as HTMLInputElement;
    expect(input.getAttribute('maxlength')).toBe('100');

    fixture.componentInstance.form.setValue({ name: 'A'.repeat(101), email: 'a@example.com' });
    fixture.componentInstance.form.markAllAsTouched();
    fixture.componentInstance.save();
    await fixture.whenStable();

    http.expectNone(`${API_URL}/members`);
    expect(document.body.textContent).toContain('El nombre no puede superar los 100 caracteres.');
  });

  it('pide confirmación si el nombre tiene números y guarda al confirmar', async () => {
    const fixture = create();
    fixture.componentInstance.openCreate();
    fixture.componentInstance.form.setValue({ name: 'Ana 123', email: 'ana@example.com' });
    await fixture.whenStable();

    expect(document.body.textContent).toContain('El nombre contiene números.');

    fixture.componentInstance.save();
    await fixture.whenStable();
    http.expectNone(`${API_URL}/members`); // aún no se envía
    expect(fixture.componentInstance.nameConfirmOpen()).toBe(true);

    fixture.componentInstance.confirmName();
    const req = http.expectOne((r) => r.method === 'POST' && r.url === `${API_URL}/members`);
    expect(req.request.body.name).toBe('Ana 123');
    req.flush({ id: 3, name: 'Ana 123', email: 'ana@example.com' });
    http.expectOne(`${API_URL}/members`).flush([]);
    expect(fixture.componentInstance.nameConfirmOpen()).toBe(false);
  });

  it('pide confirmación si el nombre es una sola letra y permite revisarlo', async () => {
    const fixture = create();
    fixture.componentInstance.openCreate();
    fixture.componentInstance.form.setValue({ name: 'X', email: 'x@example.com' });
    fixture.componentInstance.save();
    await fixture.whenStable();

    expect(fixture.componentInstance.nameConfirmOpen()).toBe(true);
    fixture.componentInstance.reviewName();
    expect(fixture.componentInstance.nameConfirmOpen()).toBe(false);
    http.expectNone(`${API_URL}/members`);
  });

  it('crea el usuario cuando el formulario es válido', () => {
    const fixture = create();
    fixture.componentInstance.form.setValue({ name: 'Laura Gómez', email: 'laura@example.com' });
    fixture.componentInstance.save();

    const req = http.expectOne(`${API_URL}/members`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.name).toBe('Laura Gómez');
    req.flush({ id: 2, name: 'Laura Gómez', email: 'laura@example.com' });
    http.expectOne(`${API_URL}/members`).flush([]);
  });
});
