import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SILENT_ERRORS } from './error.interceptor';
import {
  Book,
  BookInput,
  Loan,
  LoanQueryParams,
  LoanSummary,
  Member,
  MemberInput,
  PageResponse,
  Stats,
} from './models';

export const API_URL = 'http://localhost:8080/api';

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
  deleteBook(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/books/${id}`, { context: silentErrors() });
  }

  // Usuarios
  listMembers(): Observable<Member[]> {
    return this.http.get<Member[]>(`${API_URL}/members`);
  }
  createMember(member: MemberInput): Observable<Member> {
    return this.http.post<Member>(`${API_URL}/members`, member);
  }
  updateMember(id: number, member: MemberInput): Observable<Member> {
    return this.http.put<Member>(`${API_URL}/members/${id}`, member);
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
