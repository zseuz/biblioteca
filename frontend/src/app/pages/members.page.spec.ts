import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../core/api.service';
import { SILENT_ERRORS } from '../core/error.interceptor';
import { NotifyService } from '../core/notify.service';
import { MembersPage } from './members.page';

/**
 * Pruebas de la pantalla Usuarios: validaciones (longitudes, correo), avisos de nombre con
 * confirmación, correo repetido, borrado protegido, búsqueda sin tildes y sin conexión.
 *
 * Las pruebas no llaman al backend real: HttpTestingController captura cada petición
 * (expectOne) y la prueba decide qué responder (flush para éxito, error para fallos de red).
 * afterEach(http.verify) falla si quedó alguna petición sin responder.
 */
describe('MembersPage', () => {
  let http: HttpTestingController;

  /** Monta la pantalla y responde la carga inicial con un usuario de ejemplo. */
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
    expect(document.body.textContent).toContain('El nombre no puede superar los 100 caracteres (tiene 101).');
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

  describe('eliminación', () => {
    const withLoans = { id: 7, name: 'Ana Torres', email: 'ana@example.com', activeLoans: 2, totalLoans: 5 };
    const noLoans = { id: 8, name: 'Bruno Díaz', email: 'bruno@example.com', activeLoans: 0, totalLoans: 0 };

    it('si el usuario tiene préstamos, informa sin hacer la petición', async () => {
      const fixture = create();
      fixture.componentInstance.remove(withLoans);
      await fixture.whenStable();

      expect(fixture.componentInstance.canDelete()).toBe(false);
      expect(document.body.textContent).toContain('No se puede eliminar');
      expect(document.body.textContent).toContain('tiene 2 préstamos activos y 5 préstamos en su historial');
      expect(document.querySelector('.confirm-message strong')?.textContent).toBe('Ana Torres');
      // Solo hay un botón ("Entendido"): no existe forma de lanzar la petición destinada a fallar.
      const buttons = Array.from(document.querySelectorAll('.confirm-actions button')).map((b) =>
        b.textContent?.trim(),
      );
      expect(buttons).toEqual(['Entendido']);

      fixture.componentInstance.confirmDelete();
      http.expectNone((r) => r.method === 'DELETE');
    });

    it('si no tiene préstamos, confirma y elimina', async () => {
      const fixture = create();
      fixture.componentInstance.remove(noLoans);
      await fixture.whenStable();
      expect(document.body.textContent).toContain('¿Seguro que deseas eliminar a Bruno Díaz?');
      // El nombre va en negrita.
      expect(document.querySelector('.confirm-message strong')?.textContent).toBe('Bruno Díaz');

      fixture.componentInstance.confirmDelete();
      http.expectOne((r) => r.method === 'DELETE' && r.url === `${API_URL}/members/8`).flush(null);
      http.expectOne(`${API_URL}/members`).flush([]);
      expect(fixture.componentInstance.deleteDialogOpen()).toBe(false);
    });

    it('si el servidor la rechaza, muestra el motivo dentro del diálogo', async () => {
      const fixture = create();
      fixture.componentInstance.remove(noLoans);
      fixture.componentInstance.confirmDelete();
      http
        .expectOne((r) => r.method === 'DELETE')
        .flush(
          { status: 409, message: 'No se puede eliminar un usuario con historial de préstamos' },
          { status: 409, statusText: 'Conflict' },
        );
      await fixture.whenStable();

      expect(fixture.componentInstance.deleteDialogOpen()).toBe(true);
      expect(fixture.componentInstance.deleting()).toBe(false);
      expect(document.querySelector('.confirm-error')?.textContent).toContain('historial de préstamos');
    });
  });

  it('si el correo ya existe, lo indica junto al campo y no con un aviso flotante', async () => {
    const fixture = create();
    fixture.componentInstance.openCreate();
    fixture.componentInstance.form.setValue({ name: 'Carlos Ruiz', email: 'carlos@example.com' });
    fixture.componentInstance.save();

    const req = http.expectOne((r) => r.method === 'POST' && r.url === `${API_URL}/members`);
    expect(req.request.context.get(SILENT_ERRORS)).toBe(true);
    req.flush(
      { status: 409, message: 'Ya existe un usuario con ese correo' },
      { status: 409, statusText: 'Conflict' },
    );
    await fixture.whenStable();

    const email = fixture.componentInstance.form.controls.email;
    expect(email.hasError('taken')).toBe(true);
    expect(document.body.textContent).toContain('Ya existe un usuario con ese correo.');
    expect(fixture.componentInstance.isModalOpen()).toBe(true); // el formulario sigue abierto
    expect(fixture.componentInstance.saving()).toBe(false);
    expect(TestBed.inject(NotifyService).notice()).toBeNull();

    // Al corregir el correo, el error desaparece.
    email.setValue('carlos.ruiz@example.com');
    expect(email.hasError('taken')).toBe(false);
  });

  it('el botón de guardar conserva su ancho mientras guarda', async () => {
    const fixture = create();
    fixture.componentInstance.openCreate();
    fixture.componentInstance.form.setValue({ name: 'Laura Gómez', email: 'laura@example.com' });
    fixture.componentInstance.save();
    await fixture.whenStable();

    const button = document.querySelector<HTMLButtonElement>('button[form="member-form"]')!;
    expect(button.classList).toContain('is-loading');
    expect(button.querySelector('.btn-label')?.textContent?.trim()).toBe('Agregar usuario');
    expect(button.querySelector('.btn-spinner')).not.toBeNull();

    http.expectOne((r) => r.method === 'POST').flush({ id: 9, name: 'Laura Gómez', email: 'laura@example.com' });
    http.expectOne(`${API_URL}/members`).flush([]);
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

  it('la búsqueda ignora mayúsculas y tildes', async () => {
    const fixture = create();
    fixture.componentInstance.members.set([
      { id: 1, name: 'Bruno Díaz', email: 'bruno@example.com', activeLoans: 0, totalLoans: 0 },
      { id: 2, name: 'María Gómez', email: 'maria@example.com', activeLoans: 0, totalLoans: 0 },
    ]);

    fixture.componentInstance.searchTerm.set('diaz');
    expect(fixture.componentInstance.filteredMembers().map((m) => m.name)).toEqual(['Bruno Díaz']);
    fixture.componentInstance.searchTerm.set('GÓMEZ');
    expect(fixture.componentInstance.filteredMembers().map((m) => m.name)).toEqual(['María Gómez']);
    fixture.componentInstance.searchTerm.set('gomez');
    expect(fixture.componentInstance.filteredMembers().map((m) => m.name)).toEqual(['María Gómez']);
  });


  describe('validaciones del formulario', () => {
    const errors = () => Array.from(document.querySelectorAll('app-modal .error')).map((e) => e.textContent?.trim());
    /** Escribe en el campo como lo haría el usuario (el evento input repinta la pantalla). */
    const typeInto = (id: string, value: string) => {
      const el = document.getElementById(id) as HTMLInputElement;
      el.value = value;
      el.dispatchEvent(new Event('input'));
    };

    it('distingue un campo vacío de un correo mal escrito o demasiado corto', async () => {
      const fixture = create();
      fixture.componentInstance.openCreate();
      const form = fixture.componentInstance.form;

      form.setValue({ name: '', email: '' });
      form.markAllAsTouched();
      await fixture.whenStable();
      expect(errors()).toEqual(['El nombre es obligatorio.', 'El correo es obligatorio.']);

      form.setValue({ name: 'Ana', email: 'no-es-correo' });
      await fixture.whenStable();
      expect(errors()).toEqual(['Ingresa un correo válido, por ejemplo nombre@dominio.com.']);

      typeInto('email', 'a@b.c');
      await fixture.whenStable();
      expect(errors()).toEqual(['El correo debe tener al menos 6 caracteres (tiene 5).']);

      typeInto('email', 'a'.repeat(150) + '@example.com');
      await fixture.whenStable();
      expect(errors()[0]).toContain('El correo no puede superar los 150 caracteres (tiene 162)');
    });

    it('un nombre de 2 caracteres no es un error: pide confirmación, como el de una letra', async () => {
      const fixture = create();
      fixture.componentInstance.openCreate();
      fixture.componentInstance.form.setValue({ name: 'Al', email: 'al@example.com' });
      fixture.componentInstance.save();
      await fixture.whenStable();

      http.expectNone(`${API_URL}/members`); // todavía no guarda
      expect(document.body.textContent).toContain('El nombre tiene solo 2 caracteres.');
    });
  });


  it('si el servidor no responde, avisa del error en lugar de decir que no hay usuarios', async () => {
    const fixture = TestBed.createComponent(MembersPage);
    fixture.detectChanges();
    http.expectOne(`${API_URL}/members`).error(new ProgressEvent('error'));
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No se pudieron cargar los usuarios');
    expect(text).not.toContain('No hay usuarios registrados');
  });

  it('sin usuarios registrados lo informa e invita a agregar el primero', async () => {
    const fixture = TestBed.createComponent(MembersPage);
    fixture.detectChanges();
    http.expectOne(`${API_URL}/members`).flush([]);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No hay usuarios registrados');
  });

});
