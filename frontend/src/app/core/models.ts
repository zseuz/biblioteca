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

export interface Member {
  id: number;
  name: string;
  email: string;
}

export type MemberInput = Pick<Member, 'name' | 'email'>;

export type LoanStatus = 'ACTIVE' | 'OVERDUE' | 'RETURNED';

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
