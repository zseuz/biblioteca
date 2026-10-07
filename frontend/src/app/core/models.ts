export interface Book {
  id: number;
  title: string;
  author: string;
  genre: string;
  totalCopies: number;
  availableCopies: number;
  available: boolean;
}

export type BookInput = Pick<Book, 'title' | 'author' | 'genre' | 'totalCopies'>;

/** Resultado de comprobar si un libro ya existe antes de registrarlo. */
export interface BookDuplicateCheck {
  /** Mismo título, autor y género: se le pueden añadir ejemplares en vez de duplicarlo. */
  sameBook: Book | null;
  /** Mismo título y autor con otro género: se muestra la diferencia para confirmar. */
  differentGenre: Book[];
}

export interface Member {
  id: number;
  name: string;
  email: string;
  /** Préstamos sin devolver. */
  activeLoans?: number;
  /** Préstamos registrados en total; si es > 0 el usuario no se puede eliminar. */
  totalLoans?: number;
}

export type MemberInput = Pick<Member, 'name' | 'email'>;

export type LoanStatus = 'ACTIVE' | 'OVERDUE' | 'RETURNED';

/** Filtro de estado del historial (ALL = sin filtrar). */
export type LoanStatusFilter = 'ALL' | LoanStatus;
export type LoanSortField = 'bookTitle' | 'memberName' | 'loanDate' | 'dueDate' | 'status';

/** Página de resultados tal como la devuelve la API. */
export interface PageResponse<T> {
  content: T[];
  /** Página actual, empezando en 0. */
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Criterios de búsqueda del historial de préstamos (se envían como query params). */
export interface LoanQueryParams {
  status: LoanStatusFilter;
  q: string;
  sort: LoanSortField;
  direction: 'asc' | 'desc';
  page: number;
  size: number;
}

/** Contadores por estado (pestañas e indicadores). */
export interface LoanSummary {
  total: number;
  active: number;
  overdue: number;
  returned: number;
}

export interface Loan {
  id: number;
  bookId: number;
  bookTitle: string;
  memberId: number;
  memberName: string;
  loanDate: string;
  dueDate: string;
  returnDate: string | null;
  status: LoanStatus;
  /** Veces que se renovó (cada renovación da de nuevo el plazo completo desde ese día). */
  renewals?: number;
  lastRenewedOn?: string | null;
}

export interface StatEntry {
  label: string;
  count: number;
}

export interface Stats {
  totalBooks: number;
  totalMembers: number;
  activeLoans: number;
  overdueLoans: number;
  returnedLoans: number;
  /** Últimos 6 meses, del más antiguo al actual; label en formato ISO "2026-10". */
  loansByMonth: StatEntry[];
  topBooks: StatEntry[];
  loansByGenre: StatEntry[];
  topMembers: StatEntry[];
}
