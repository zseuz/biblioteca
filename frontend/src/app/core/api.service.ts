import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { SILENT_ERRORS } from './error.interceptor';
import {
  Book,
  BookDuplicateCheck,
  BookInput,
  Loan,
  LoanRenewalHistory,
  LoanQueryParams,
  LoanSummary,
  Member,
  MemberInput,
  PageResponse,
  Stats,
} from './models';

/** URL base de la API: localhost en desarrollo, el backend publicado en producción. */
export const API_URL = environment.apiUrl;

const silentErrors = () => new HttpContext().set(SILENT_ERRORS, true);

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // Libros
  listBooks(q = ''): Observable<Book[]> {
    const params = q.trim() ? new HttpParams().set('q', q.trim()) : undefined;
    return this.http.get<Book[]>(`${API_URL}/books`, { params });
  }
  createBook(book: BookInput): Observable<Book> {
    return this.http.post<Book>(`${API_URL}/books`, book);
  }
  updateBook(id: number, book: BookInput): Observable<Book> {
    return this.http.put<Book>(`${API_URL}/books/${id}`, book);
  }
  /** El error (p. ej. 409 por historial) lo muestra el diálogo de confirmación, no el aviso global. */
  /** Comprueba si el libro ya está registrado (sin distinguir mayúsculas ni espacios). */
  checkBookDuplicates(book: Pick<BookInput, 'title' | 'author' | 'genre'>): Observable<BookDuplicateCheck> {
    const params = new HttpParams()
      .set('title', book.title)
      .set('author', book.author)
      .set('genre', book.genre);
    return this.http.get<BookDuplicateCheck>(`${API_URL}/books/duplicates`, { params });
  }
  /** Añade ejemplares disponibles a un libro existente. */
  addCopies(id: number, quantity: number): Observable<Book> {
    return this.http.post<Book>(`${API_URL}/books/${id}/copies`, { quantity });
  }
  deleteBook(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/books/${id}`, { context: silentErrors() });
  }

  // Usuarios
  listMembers(): Observable<Member[]> {
    return this.http.get<Member[]>(`${API_URL}/members`);
  }
  /** Los errores (p. ej. correo ya registrado) se muestran en el propio formulario. */
  createMember(member: MemberInput): Observable<Member> {
    return this.http.post<Member>(`${API_URL}/members`, member, { context: silentErrors() });
  }
  updateMember(id: number, member: MemberInput): Observable<Member> {
    return this.http.put<Member>(`${API_URL}/members/${id}`, member, { context: silentErrors() });
  }
  /** El error (p. ej. 409 por historial) lo muestra el diálogo de confirmación, no el aviso global. */
  deleteMember(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/members/${id}`, { context: silentErrors() });
  }

  // Préstamos
  /** Historial paginado: filtros, búsqueda, orden y paginación se resuelven en el servidor. */
  searchLoans(query: LoanQueryParams): Observable<PageResponse<Loan>> {
    let params = new HttpParams()
      .set('status', query.status)
      .set('sort', query.sort)
      .set('direction', query.direction)
      .set('page', query.page)
      .set('size', query.size);
    if (query.q.trim()) {
      params = params.set('q', query.q.trim());
    }
    return this.http.get<PageResponse<Loan>>(`${API_URL}/loans`, { params });
  }

  /** Contadores por estado (total, activos, vencidos, devueltos). */
  loanSummary(): Observable<LoanSummary> {
    return this.http.get<LoanSummary>(`${API_URL}/loans/summary`);
  }
  lend(bookId: number, memberId: number): Observable<Loan> {
    return this.http.post<Loan>(`${API_URL}/loans`, { bookId, memberId });
  }
  /** Préstamos sin devolver de un usuario para un libro (para avisar de un préstamo repetido). */
  activeLoansFor(memberId: number, bookId: number): Observable<Loan[]> {
    const params = new HttpParams().set('memberId', memberId).set('bookId', bookId);
    return this.http.get<Loan[]>(`${API_URL}/loans/active`, { params });
  }
  /** Renueva un préstamo en plazo: vuelve a tener 14 días desde hoy. */
  /**
   * Renueva un préstamo en plazo: vuelve a tener 14 días desde hoy.
   * Con {@code silent} el error no se muestra como aviso global (lo presenta quien llama).
   */
  renewLoan(id: number, silent = false): Observable<Loan> {
    return this.http.post<Loan>(`${API_URL}/loans/${id}/renew`, {}, silent ? { context: silentErrors() } : {});
  }
  /** Préstamo inicial y cada renovación con su fecha y hora. */
  renewalHistory(id: number): Observable<LoanRenewalHistory> {
    return this.http.get<LoanRenewalHistory>(`${API_URL}/loans/${id}/renewals`);
  }
  giveBack(id: number): Observable<Loan> {
    return this.http.post<Loan>(`${API_URL}/loans/${id}/return`, {});
  }

  // Estadísticas
  /**
   * Estadísticas del panel. Se normalizan los campos opcionales para que un backend con una
   * versión anterior del contrato (sin la serie mensual) no rompa las gráficas con NaN.
   */
  stats(): Observable<Stats> {
    return this.http.get<Partial<Stats>>(`${API_URL}/stats`).pipe(
      map((s) => ({
        totalBooks: s.totalBooks ?? 0,
        totalMembers: s.totalMembers ?? 0,
        activeLoans: s.activeLoans ?? 0,
        overdueLoans: s.overdueLoans ?? 0,
        returnedLoans: s.returnedLoans ?? 0,
        loansByMonth: s.loansByMonth ?? [],
        topBooks: s.topBooks ?? [],
        loansByGenre: s.loansByGenre ?? [],
        topMembers: s.topMembers ?? [],
      })),
    );
  }
}
