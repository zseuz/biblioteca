import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Book, BookInput, Loan, Member, MemberInput, Stats } from './models';

export const API_URL = 'http://localhost:8080/api';

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
  deleteBook(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/books/${id}`);
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
  deleteMember(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/members/${id}`);
  }

  // Préstamos
  listLoans(): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${API_URL}/loans`);
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
