/**
 * Libro tal como lo devuelve la API ({@code BookResponse} del backend). Estas interfaces
 * describen la forma exacta del JSON; TypeScript avisa al compilar si se usa un campo que no existe.
 */
export interface Book {
  /** Identificador del libro en la base de datos. */
  id: number;
  /** Título del libro. */
  title: string;
  /** Autor. */
  author: string;
  /** Género literario. */
  genre: string;
  /** Ejemplares en total (prestados y disponibles). */
  totalCopies: number;
  /** Ejemplares que se pueden prestar ahora mismo. */
  availableCopies: number;
  /** true si queda al menos un ejemplar; false = libro agotado. */
  available: boolean;
}

/** Datos que se envían para crear o editar un libro (sin id ni disponibles, que calcula el servidor). */
export type BookInput = Pick<Book, 'title' | 'author' | 'genre' | 'totalCopies'>;

/** Resultado de comprobar si un libro ya existe antes de registrarlo. */
export interface BookDuplicateCheck {
  /** Mismo título, autor y género: se le pueden añadir ejemplares en vez de duplicarlo. */
  sameBook: Book | null;
  /** Mismo título y autor con otro género: se muestra la diferencia para confirmar. */
  differentGenre: Book[];
}

/** Usuario de la biblioteca ({@code MemberResponse} del backend). */
export interface Member {
  /** Identificador del usuario. */
  id: number;
  /** Nombre completo. */
  name: string;
  /** Correo (único, guardado en minúsculas). */
  email: string;
  /** Préstamos sin devolver. */
  activeLoans?: number;
  /** Préstamos registrados en total; si es > 0 el usuario no se puede eliminar. */
  totalLoans?: number;
}

/** Datos que se envían para crear o editar un usuario. */
export type MemberInput = Pick<Member, 'name' | 'email'>;

/** Estado de un préstamo: en plazo, vencido (sin devolver y fuera de plazo) o devuelto. */
export type LoanStatus = 'ACTIVE' | 'OVERDUE' | 'RETURNED';

/** Filtro de estado del historial (ALL = sin filtrar). */
export type LoanStatusFilter = 'ALL' | LoanStatus;
/** Columnas por las que se puede ordenar el historial (las mismas que acepta la API). */
export type LoanSortField = 'bookTitle' | 'memberName' | 'loanDate' | 'dueDate' | 'status';

/** Página de resultados tal como la devuelve la API. */
export interface PageResponse<T> {
  /** Elementos de esta página. */
  content: T[];
  /** Página actual, empezando en 0. */
  page: number;
  /** Elementos por página. */
  size: number;
  /** Elementos en total (todas las páginas). */
  totalElements: number;
  /** Número de páginas. */
  totalPages: number;
}

/** Criterios de búsqueda del historial de préstamos (se envían como query params). */
export interface LoanQueryParams {
  /** Filtro de estado. */
  status: LoanStatusFilter;
  /** Texto a buscar en el título del libro o el nombre del usuario. */
  q: string;
  /** Columna de orden. */
  sort: LoanSortField;
  /** Sentido del orden. */
  direction: 'asc' | 'desc';
  /** Página pedida, empezando en 0. */
  page: number;
  /** Elementos por página (10, 20 o 50 en la interfaz). */
  size: number;
}

/** Contadores por estado (pestañas e indicadores). */
export interface LoanSummary {
  /** Todos los préstamos registrados. */
  total: number;
  /** En plazo (sin devolver y sin vencer). */
  active: number;
  /** Vencidos (sin devolver y fuera de plazo). */
  overdue: number;
  /** Ya devueltos. */
  returned: number;
}

/**
 * Préstamo tal como lo devuelve la API ({@code LoanResponse}). Trae el título del libro y el
 * nombre del usuario para no tener que pedirlos aparte. Las fechas llegan como texto ISO ("2026-10-07").
 */
export interface Loan {
  /** Identificador del préstamo. */
  id: number;
  /** Libro prestado (id y título). */
  bookId: number;
  bookTitle: string;
  /** Usuario que lo tiene (id y nombre). */
  memberId: number;
  memberName: string;
  /** Día del préstamo (no cambia al renovar). */
  loanDate: string;
  /** Fecha límite de devolución. */
  dueDate: string;
  /** Día de la devolución; null mientras no se devuelve. */
  returnDate: string | null;
  /** Estado calculado por el servidor según la fecha de hoy. */
  status: LoanStatus;
  /** Veces que se renovó (cada renovación da de nuevo el plazo completo desde ese día). */
  renewals?: number;
  /** Día de la última renovación (null si nunca se renovó). */
  lastRenewedOn?: string | null;
  /** Fecha y hora de la última renovación ("2026-10-07T10:42:05"); puede faltar en renovaciones antiguas. */
  lastRenewedAt?: string | null;
  /**
   * Primer día en que se puede renovar (solo cuando faltan pocos días para el vencimiento);
   * {@code null} si el préstamo ya fue devuelto.
   */
  renewableFrom?: string | null;
}

/** Una renovación del historial. */
export interface LoanRenewalEntry {
  /** 1 = la primera renovación. */
  number: number;
  /** Fecha y hora de la renovación ("2026-10-07T10:42:05"). */
  renewedAt: string;
  /** Fecha límite antes de renovar. */
  previousDueDate: string;
  /** Fecha límite después de renovar. */
  newDueDate: string;
  /** Días que se ganaron con la renovación. */
  daysAdded: number;
}

/** Historial de renovaciones con los datos del préstamo inicial. */
export interface LoanRenewalHistory {
  /** Estado actual del préstamo. */
  loan: Loan;
  /** Fecha límite con la que se registró el préstamo. */
  originalDueDate: string;
  /** Renovaciones con detalle, de la más antigua a la más reciente. */
  renewals: LoanRenewalEntry[];
  /** Renovaciones hechas antes de que se guardara el historial (sin detalle). */
  unrecordedRenewals: number;
}

/** Un par «etiqueta → cantidad» de las gráficas (un mes, un libro, un género o un usuario). */
export interface StatEntry {
  /** Qué se cuenta (p. ej. «Dune» o «2026-10»). */
  label: string;
  /** Cuántos préstamos. */
  count: number;
}

/** Todos los datos del panel de estadísticas, en una sola respuesta de /api/stats. */
export interface Stats {
  /** Títulos en el catálogo. */
  totalBooks: number;
  /** Usuarios registrados. */
  totalMembers: number;
  /** Préstamos en plazo (los vencidos se cuentan aparte). */
  activeLoans: number;
  /** Préstamos vencidos. */
  overdueLoans: number;
  /** Préstamos devueltos (histórico). */
  returnedLoans: number;
  /** Últimos 6 meses, del más antiguo al actual; label en formato ISO "2026-10". */
  loansByMonth: StatEntry[];
  /** Los 5 libros más prestados. */
  topBooks: StatEntry[];
  /** Préstamos por género, de más a menos. */
  loansByGenre: StatEntry[];
  /** Los 5 usuarios con más préstamos. */
  topMembers: StatEntry[];
}
