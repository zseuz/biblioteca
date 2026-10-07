import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL, ApiService } from './api.service';
import { errorInterceptor, messageFor } from './error.interceptor';
import { NotifyService } from './notify.service';

/**
 * Pruebas del servicio de API y del interceptor de errores: que cada método arme bien la
 * URL y los parámetros, y que los errores del servidor se conviertan en mensajes legibles.
 *
 * Las pruebas no llaman al backend real: HttpTestingController captura cada petición
 * (expectOne) y la prueba decide qué responder (flush para éxito, error para fallos de red).
 * afterEach(http.verify) falla si quedó alguna petición sin responder.
 */
describe('ApiService', () => {
  let api: ApiService;
  let http: HttpTestingController;
  let notify: NotifyService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
    notify = TestBed.inject(NotifyService);
  });

  afterEach(() => http.verify());

  it('envía el término de búsqueda como parámetro q', () => {
    api.listBooks('  dune ').subscribe();
    const req = http.expectOne((r) => r.url === `${API_URL}/books`);
    expect(req.request.params.get('q')).toBe('dune');
    req.flush([]);
  });

  it('no envía q cuando la búsqueda está vacía', () => {
    api.listBooks('  ').subscribe();
    const req = http.expectOne((r) => r.url === `${API_URL}/books`);
    expect(req.request.params.has('q')).toBe(false);
    req.flush([]);
  });

  it('muestra el mensaje de negocio devuelto por la API', () => {
    api.lend(1, 2).subscribe({ error: () => undefined });
    http
      .expectOne(`${API_URL}/loans`)
      .flush(
        { status: 409, message: 'No hay ejemplares disponibles' },
        { status: 409, statusText: 'Conflict' },
      );
    expect(notify.notice()).toEqual({ kind: 'error', text: 'No hay ejemplares disponibles' });
  });

  it('avisa cuando no hay conexión con el servidor', () => {
    const err = new HttpErrorResponse({ status: 0 });
    expect(messageFor(err)).toContain('No se pudo conectar');
  });

  it('une los errores de validación por campo', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: { message: 'Datos inválidos', fields: { title: 'no debe estar vacío' } },
    });
    expect(messageFor(err)).toBe('title: no debe estar vacío');
  });
});
