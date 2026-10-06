import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { Book, Loan, LoanStatus, Member } from '../core/models';
import { NotifyService } from '../core/notify.service';

const STATUS_LABEL: Record<LoanStatus, string> = {
  ACTIVE: 'Activo',
  OVERDUE: 'Vencido',
  RETURNED: 'Devuelto',
};
const STATUS_CLASS: Record<LoanStatus, string> = {
  ACTIVE: 'ok',
  OVERDUE: 'bad',
  RETURNED: 'muted',
};

@Component({
  selector: 'app-loans-page',
  imports: [ReactiveFormsModule],
  template: `
    <h1>Préstamos</h1>

    <section class="card" aria-labelledby="form-title">
      <h2 id="form-title">Registrar préstamo</h2>
      <p class="empty">Reglas: 14 días de plazo, máximo 3 préstamos activos por usuario y sin préstamos vencidos pendientes.</p>
      <form [formGroup]="form" (ngSubmit)="lend()" novalidate>
        <div class="grid">
          <div>
            <label for="member">Usuario</label>
            <select id="member" formControlName="memberId" [class.invalid]="invalid('memberId')" [attr.aria-invalid]="invalid('memberId')">
              <option value="">Selecciona un usuario</option>
              @for (m of members(); track m.id) { <option [value]="m.id">{{ m.name }}</option> }
            </select>
            @if (invalid('memberId')) { <p class="error">Selecciona un usuario.</p> }
          </div>
          <div>
            <label for="book">Libro</label>
            <select id="book" formControlName="bookId" [class.invalid]="invalid('bookId')" [attr.aria-invalid]="invalid('bookId')">
              <option value="">Selecciona un libro</option>
              @for (b of availableBooks(); track b.id) { <option [value]="b.id">{{ b.title }} ({{ b.availableCopies }} disp.)</option> }
            </select>
            @if (invalid('bookId')) { <p class="error">Selecciona un libro.</p> }
          </div>
        </div>
        <div class="actions">
          <button class="primary" type="submit" [disabled]="saving()">Prestar libro</button>
        </div>
      </form>
    </section>

    <section class="card" aria-labelledby="list-title">
      <h2 id="list-title">Historial</h2>
      @if (loading()) {
        <p class="empty">Cargando…</p>
      } @else if (loans().length === 0) {
        <p class="empty">Todavía no hay préstamos.</p>
      } @else {
        <div class="table-wrap">
          <table>
            <caption class="sr-only">Lista de préstamos</caption>
            <thead><tr><th>Libro</th><th>Usuario</th><th>Préstamo</th><th>Vence</th><th>Devuelto</th><th>Estado</th><th><span class="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              @for (l of loans(); track l.id) {
                <tr>
                  <td>{{ l.bookTitle }}</td>
                  <td>{{ l.memberName }}</td>
                  <td>{{ l.loanDate }}</td>
                  <td>{{ l.dueDate }}</td>
                  <td>{{ l.returnDate ?? '—' }}</td>
                  <td><span class="badge" [class]="'badge ' + statusClass(l.status)">{{ statusLabel(l.status) }}</span></td>
                  <td>
                    @if (l.status !== 'RETURNED') {
                      <button type="button" (click)="giveBack(l)" [attr.aria-label]="'Registrar devolución de ' + l.bookTitle">Devolver</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class LoansPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder);

  readonly loans = signal<Loan[]>([]);
  readonly members = signal<Member[]>([]);
  readonly availableBooks = signal<Book[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly form = this.fb.group({
    memberId: this.fb.control<string | null>(null, Validators.required),
    bookId: this.fb.control<string | null>(null, Validators.required),
  });

  ngOnInit(): void {
    this.load();
  }

  invalid(name: 'memberId' | 'bookId'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  statusLabel(s: LoanStatus): string {
    return STATUS_LABEL[s];
  }

  statusClass(s: LoanStatus): string {
    return STATUS_CLASS[s];
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      loans: this.api.listLoans(),
      members: this.api.listMembers(),
      books: this.api.listBooks(),
    }).subscribe({
      next: ({ loans, members, books }) => {
        this.loans.set(loans);
        this.members.set(members);
        this.availableBooks.set(books.filter(b => b.available));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  lend(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { memberId, bookId } = this.form.getRawValue();
    this.saving.set(true);
    this.api.lend(Number(bookId), Number(memberId)).subscribe({
      next: loan => {
        this.notify.ok(`Préstamo registrado, vence el ${loan.dueDate}`);
        this.form.reset();
        this.saving.set(false);
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  giveBack(loan: Loan): void {
    this.api.giveBack(loan.id).subscribe({
      next: () => { this.notify.ok('Devolución registrada'); this.load(); },
    });
  }
}
