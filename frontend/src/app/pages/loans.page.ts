import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of, switchMap, tap } from 'rxjs';
import { ApiService } from '../core/api.service';
import {
  Book,
  Loan,
  LoanRenewalHistory,
  LoanQueryParams,
  LoanStatus,
  LoanSummary,
  Member,
  PageResponse,
} from '../core/models';
import { NotifyService } from '../core/notify.service';
import { ActionMenuComponent, ActionMenuItem } from '../shared/action-menu.component';
import { PaginatorComponent } from '../shared/paginator.component';
import { LoanRepeat, LoanRepeatDialogComponent } from './loan-repeat-dialog.component';
import { LoanRenewalsDialogComponent } from './loan-renewals-dialog.component';
import { messageFor } from '../core/error.interceptor';
import { ComboboxComponent, ComboboxOption } from '../shared/combobox.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';
import { EmptyStateComponent } from '../shared/empty-state.component';
import { IconComponent } from '../shared/icon.component';
import { ModalComponent } from '../shared/modal.component';
import { SkeletonComponent } from '../shared/skeleton.component';

export type LoanFilterStatus = 'ALL' | 'ACTIVE' | 'OVERDUE' | 'RETURNED';
export type LoanSortField = 'bookTitle' | 'memberName' | 'loanDate' | 'dueDate' | 'status';
export type SortOrder = 'asc' | 'desc';

@Component({
  selector: 'app-loans-page',
  imports: [
    ReactiveFormsModule,
    IconComponent,
    ActionMenuComponent,
    PaginatorComponent,
    LoanRepeatDialogComponent,
    LoanRenewalsDialogComponent,
    ComboboxComponent,
    ModalComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Encabezado de página -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Gestión de Préstamos</h1>
        <p class="page-desc">
          Control de circulación de libros, plazos de devolución y préstamos vencidos.
        </p>
      </div>
      <button type="button" class="btn btn-primary" (click)="openCreateModal()">
        <app-icon name="plus" [size]="16" />
        Registrar préstamo
      </button>
    </div>

    <!-- Métricas rápidas de préstamos -->
    <div class="kpi-strip">
      <div class="kpi-chip">
        <div class="kpi-chip-icon"><app-icon name="loans" [size]="18" /></div>
        <div>
          <span class="kpi-chip-val">{{ activeLoansCount() }}</span>
          <span class="kpi-chip-lbl">Préstamos activos</span>
        </div>
      </div>
      <div class="kpi-chip">
        <div class="kpi-chip-icon" [class.danger]="overdueLoansCount() > 0">
          <app-icon name="alert" [size]="18" />
        </div>
        <div>
          <span class="kpi-chip-val" [class.alert-val]="overdueLoansCount() > 0">{{
            overdueLoansCount()
          }}</span>
          <span class="kpi-chip-lbl">Préstamos vencidos</span>
        </div>
      </div>
      <div class="kpi-chip">
        <div class="kpi-chip-icon success"><app-icon name="check" [size]="18" /></div>
        <div>
          <span class="kpi-chip-val">{{ returnedLoansCount() }}</span>
          <span class="kpi-chip-lbl">Devueltos con éxito</span>
        </div>
      </div>
    </div>

    <!-- Barra de filtros y búsqueda -->
    <div class="toolbar card">
      <div class="toolbar-left">
        <div class="search-input-wrap">
          <app-icon name="search" [size]="16" class="search-icon" />
          <label for="search-loans" class="sr-only">Buscar préstamos</label>
          <input
            id="search-loans"
            type="search"
            placeholder="Buscar por libro o usuario..."
            [value]="searchTerm()"
            (input)="onSearchInput($event)"
          />
          @if (searchTerm()) {
            <button
              type="button"
              class="clear-search-btn"
              (click)="clearSearch()"
              aria-label="Limpiar búsqueda"
            >
              <app-icon name="close" [size]="14" />
            </button>
          }
        </div>
      </div>

      <div class="toolbar-right">
        <div class="filter-pills" role="radiogroup" aria-label="Filtrar préstamos">
          <button
            type="button"
            class="pill-btn"
            [class.active]="statusFilter() === 'ALL'"
            (click)="setStatus('ALL')"
          >
            Todos ({{ totalLoansCount() }})
          </button>
          <button
            type="button"
            class="pill-btn"
            [class.active]="statusFilter() === 'ACTIVE'"
            (click)="setStatus('ACTIVE')"
          >
            Activos ({{ activeLoansCount() }})
          </button>
          <button
            type="button"
            class="pill-btn"
            [class.active]="statusFilter() === 'OVERDUE'"
            [class.pill-danger]="overdueLoansCount() > 0"
            (click)="setStatus('OVERDUE')"
          >
            Vencidos ({{ overdueLoansCount() }})
          </button>
          <button
            type="button"
            class="pill-btn"
            [class.active]="statusFilter() === 'RETURNED'"
            (click)="setStatus('RETURNED')"
          >
            Devueltos ({{ returnedLoansCount() }})
          </button>
        </div>
      </div>
    </div>

    <!-- Tabla de historial -->
    <section class="loans-section" aria-labelledby="loans-heading">
      <h2 id="loans-heading" class="sr-only">Historial de préstamos</h2>

      @if (loading() && !result()) {
        <div class="card p-3">
          <div class="skeleton-stack">
            <app-skeleton height="2.2rem" />
            <app-skeleton height="2.2rem" />
            <app-skeleton height="2.2rem" />
            <app-skeleton height="2.2rem" />
          </div>
        </div>
      } @else if (pageItems().length === 0) {
        @if (totalLoansCount() === 0) {
          <app-empty-state
            icon="loans"
            title="Todavía no hay préstamos"
            message="No se ha registrado ningún préstamo en el sistema todavía."
            actionLabel="Registrar primer préstamo"
            (action)="openCreateModal()"
          />
        } @else {
          <app-empty-state
            icon="search"
            title="Sin préstamos coincidentes"
            message="No se encontraron registros con los filtros seleccionados."
            actionLabel="Limpiar filtros"
            (action)="resetFilters()"
          />
        }
      } @else {
        <!-- Al cambiar de página se conserva la tabla atenuada: sin saltos ni parpadeos -->
        <div class="table-wrap" [class.refreshing]="fetching()" [attr.aria-busy]="fetching()">
          <table class="loans-table">
            <caption class="sr-only">
              Lista de préstamos
            </caption>
            <thead>
              <tr>
                <th class="sortable" (click)="toggleSort('bookTitle')">
                  Libro
                  <span class="sort-icon"
                    ><app-icon [name]="getSortIcon('bookTitle')" [size]="13"
                  /></span>
                </th>
                <th class="sortable" (click)="toggleSort('memberName')">
                  Usuario
                  <span class="sort-icon"
                    ><app-icon [name]="getSortIcon('memberName')" [size]="13"
                  /></span>
                </th>
                <th class="sortable" (click)="toggleSort('loanDate')">
                  Préstamo
                  <span class="sort-icon"
                    ><app-icon [name]="getSortIcon('loanDate')" [size]="13"
                  /></span>
                </th>
                <th class="sortable" (click)="toggleSort('dueDate')">
                  Vence
                  <span class="sort-icon"
                    ><app-icon [name]="getSortIcon('dueDate')" [size]="13"
                  /></span>
                </th>
                <th class="col-returned">Devuelto</th>
                <th class="sortable" (click)="toggleSort('status')">
                  Estado
                  <span class="sort-icon"
                    ><app-icon [name]="getSortIcon('status')" [size]="13"
                  /></span>
                </th>
                <th class="col-actions"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (l of pageItems(); track l.id) {
                <tr [class.row-overdue]="l.status === 'OVERDUE'">
                  <td class="col-book">
                    <div class="loan-book-cell">
                      <div class="book-mini-icon"><app-icon name="book" [size]="14" /></div>
                      <strong class="loan-book-title">{{ l.bookTitle }}</strong>
                    </div>
                  </td>
                  <td class="col-user">
                    <div class="loan-user-cell">
                      <span class="loan-user-avatar">{{ getInitials(l.memberName) }}</span>
                      <span>{{ l.memberName }}</span>
                    </div>
                  </td>
                  <td class="col-loan" data-label="Préstamo">
                    <span class="date-tag">{{ formatDate(l.loanDate) }}</span>
                  </td>
                  <td class="col-due" data-label="Vence">
                    <div class="due-date-cell">
                      <span class="date-tag" [class.due-alert]="l.status === 'OVERDUE'">
                        {{ formatDate(l.dueDate) }}
                      </span>
                      @if (l.status !== 'RETURNED') {
                        <span class="due-subtext" [class.sub-danger]="l.status === 'OVERDUE'">
                          {{ getDaysRelativeText(l.dueDate, l.status) }}
                        </span>
                      }
                      @if (l.renewals) {
                        <button
                          type="button"
                          class="renewals-link"
                          (click)="openHistory(l)"
                          [attr.aria-label]="'Ver historial de renovaciones de ' + l.bookTitle"
                          title="Ver historial de renovaciones"
                        >
                          <app-icon name="history" [size]="13" />
                          Renovado {{ l.renewals === 1 ? '1 vez' : l.renewals + ' veces' }}
                        </button>
                      }
                    </div>
                  </td>
                  <td class="col-returned">
                    @if (l.returnDate) {
                      <span class="date-tag muted">{{ formatDate(l.returnDate) }}</span>
                    } @else {
                      <span class="text-muted">—</span>
                    }
                  </td>
                  <td class="col-status">
                    <span class="badge" [class]="statusClass(l.status)">
                      <span class="dot"></span>
                      {{ statusLabel(l.status) }}
                    </span>
                    <!-- Cuando la columna Devuelto se oculta, la fecha aparece bajo el estado -->
                    @if (l.returnDate) {
                      <span class="returned-inline">el {{ formatDate(l.returnDate) }}</span>
                    }
                  </td>
                  <td class="col-actions">
                    @if (l.status !== 'RETURNED') {
                      <app-action-menu
                        [items]="l.status === 'ACTIVE' ? activeLoanActions : overdueLoanActions"
                        [label]="'Acciones para el préstamo de ' + l.bookTitle"
                        (selected)="onAction($event, l)"
                      />
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (result(); as r) {
          <app-paginator
            label="Paginación del historial de préstamos"
            [page]="r.page"
            [size]="r.size"
            [totalElements]="r.totalElements"
            [totalPages]="r.totalPages"
            [disabled]="fetching()"
            (pageChange)="goToPage($event)"
            (sizeChange)="changePageSize($event)"
          />
        }
      }
    </section>

    <!-- Modal Registrar Préstamo -->
    <app-modal
      [open]="isModalOpen()"
      title="Registrar nuevo préstamo"
      subtitle="Asigna un ejemplar a un socio registrado"
      size="lg"
      (close)="closeModal()"
    >
      <div class="rules-banner">
        <app-icon name="info" [size]="18" class="rules-icon" />
        <div class="rules-text">
          <strong>Reglas de la biblioteca:</strong>
          <span
            >Plazo de 14 días · Máximo 3 préstamos activos por socio · Sin préstamos vencidos
            pendientes.</span
          >
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="lend()" id="loan-form" novalidate>
        <div class="form-stack">
          <div class="form-group">
            <label for="member">Usuario lector *</label>
            <app-combobox
              inputId="member"
              formControlName="memberId"
              [options]="memberOptions()"
              [invalid]="invalid('memberId')"
              placeholder="Escribe el nombre o correo, o despliega la lista..."
              emptyText="Ningún usuario coincide con la búsqueda"
            />
            @if (invalid('memberId')) {
              <p class="error"><app-icon name="alert" [size]="13" /> Selecciona un usuario.</p>
            }
          </div>

          <div class="form-group">
            <label for="book">Libro a prestar *</label>
            <app-combobox
              inputId="book"
              formControlName="bookId"
              icon="book"
              [options]="bookOptions()"
              [invalid]="invalid('bookId')"
              placeholder="Escribe el título o el autor, o despliega la lista..."
              emptyText="Ningún libro disponible coincide con la búsqueda"
            />
            @if (invalid('bookId')) {
              <p class="error"><app-icon name="alert" [size]="13" /> Selecciona un libro.</p>
            }
          </div>
        </div>
      </form>

      <div modal-actions>
        <button
          type="button"
          class="btn btn-secondary"
          (click)="closeModal()"
          [disabled]="saving()"
        >
          Cancelar
        </button>
        <button type="submit" form="loan-form" class="btn btn-primary" [disabled]="saving()" [class.is-loading]="saving()" [attr.aria-busy]="saving()">
          <span class="btn-label">Prestar libro</span>
          @if (saving()) {
            <span class="spinner-sm btn-spinner" aria-hidden="true"></span>
          }
        </button>
      </div>
    </app-modal>

    <!-- Confirmación de renovación (o aviso si hoy ya no se puede renovar) -->
    <app-confirm-dialog
      [open]="!!loanToRenew()"
      [title]="renewBlocked() ? 'No se puede renovar' : 'Renovar préstamo'"
      [message]="
        renewBlocked() ??
        '¿Renovar el préstamo de ' +
          (loanToRenew()?.bookTitle ?? '') +
          ' a ' +
          (loanToRenew()?.memberName ?? '') +
          '? Vencerá 14 días después de hoy.'
      "
      [emphasis]="loanToRenew()?.bookTitle ?? ''"
      confirmText="Renovar"
      [cancelText]="renewBlocked() ? 'Entendido' : 'Cancelar'"
      [showConfirm]="!renewBlocked()"
      variant="primary"
      [loading]="renewing()"
      [error]="renewError()"
      (confirm)="confirmRenew()"
      (cancel)="loanToRenew.set(null)"
    />

    <!-- Historial de renovaciones -->
    <app-loan-renewals-dialog [loan]="historyLoan()" [history]="history()" (close)="historyLoan.set(null)" />

    <!-- Aviso: el usuario ya tiene este libro sin devolver -->
    <app-loan-repeat-dialog
      [repeat]="repeat()"
      [busy]="saving() || renewing()"
      (lendAnyway)="confirmRepeatLend()"
      (renew)="renewFromRepeat($event)"
      (cancel)="repeat.set(null)"
    />

    <!-- Modal Confirmación Devolución -->
    <app-confirm-dialog
      [open]="returnDialogOpen()"
      title="Registrar devolución"
      [message]="
        '¿Confirmas la devolución del libro «' +
        (loanToReturn()?.bookTitle ?? '') +
        '» por parte de ' +
        (loanToReturn()?.memberName ?? '') +
        '?'
      "
      confirmText="Confirmar devolución"
      variant="primary"
      [loading]="returning()"
      (confirm)="confirmReturn()"
      (cancel)="cancelReturn()"
    />
  `,
  styles: `
    .table-wrap {
      transition: opacity 0.2s ease;
    }
    .table-wrap.refreshing {
      opacity: 0.55;
    }
    /* ---- Tabla de préstamos adaptable (sin scroll horizontal) ---- */
    .loans-table td {
      white-space: normal;
    }
    .loans-table .col-actions {
      width: 1%;
      text-align: right;
    }
    .returned-inline {
      display: none;
      margin-top: 0.25rem;
      font-size: 0.75rem;
      color: var(--muted);
    }

    /* Pantallas medianas: la fecha de devolución pasa bajo el estado. */
    @media (max-width: 1100px) {
      .loans-table .col-returned {
        display: none;
      }
      .returned-inline {
        display: block;
      }
      .loans-table th,
      .loans-table td {
        padding-left: 0.7rem;
        padding-right: 0.7rem;
      }
    }

    /* Móvil: cada préstamo se muestra como una tarjeta compacta. */
    @media (max-width: 720px) {
      .loans-table thead {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
      }
      .loans-table,
      .loans-table tbody {
        display: block;
      }
      .loans-table tr {
        display: grid;
        grid-template-columns: 1fr 1fr auto;
        grid-template-areas:
          'book book actions'
          'user user status'
          'loan due due';
        gap: 0.6rem 0.75rem;
        padding: 0.9rem 0.85rem;
        border-bottom: 1px solid var(--border);
      }
      .loans-table tbody tr:last-child {
        border-bottom: 0;
      }
      .loans-table td {
        display: block;
        padding: 0;
        border: 0;
      }
      .loans-table .col-book {
        grid-area: book;
        min-width: 0;
      }
      .loans-table .col-actions {
        grid-area: actions;
        width: auto;
      }
      .loans-table .col-user {
        grid-area: user;
        align-self: center;
      }
      .loans-table .col-status {
        grid-area: status;
        justify-self: end;
        text-align: right;
      }
      .loans-table .col-loan {
        grid-area: loan;
      }
      .loans-table .col-due {
        grid-area: due;
      }
      /* Etiqueta visible para las fechas, ya que la cabecera está oculta. */
      .loans-table .col-loan::before,
      .loans-table .col-due::before {
        content: attr(data-label);
        display: block;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--muted);
        margin-bottom: 0.2rem;
      }
    }

    .pill-danger {
      color: var(--danger);
    }
    .loan-book-cell {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }
    .book-mini-icon {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      background: var(--primary-light);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .loan-book-title {
      font-weight: 600;
      color: var(--text);
    }
    .loan-user-cell {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .loan-user-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      color: var(--muted);
      font-size: 0.7rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .date-tag {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text);
    }
    .date-tag.muted {
      color: var(--muted);
    }
    .date-tag.due-alert {
      color: var(--danger);
      font-weight: 700;
    }
    .due-date-cell {
      display: flex;
      flex-direction: column;
    }
    .due-subtext {
      font-size: 0.75rem;
      color: var(--muted);
    }
    .renewals-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      width: fit-content;
      margin-top: 0.1rem;
      padding: 0;
      border: 0;
      background: none;
      color: var(--primary);
      font: inherit;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
    }
    .renewals-link:hover {
      text-decoration: underline;
    }
    .renewals-link:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 2px;
    }
    .due-subtext.sub-danger {
      color: var(--danger);
      font-weight: 600;
    }
    .row-overdue {
      background: rgba(239, 68, 68, 0.04);
    }
    .rules-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      background: var(--info-light);
      border: 1px solid var(--info-border);
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
      margin-bottom: 1.25rem;
      color: var(--text);
      font-size: 0.85rem;
    }
    .rules-icon {
      color: var(--info);
      flex-shrink: 0;
      margin-top: 0.15rem;
    }
    .rules-text {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      line-height: 1.4;
    }
  `,
})
export class LoansPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder);

  /** Página actual del historial (la devuelve el servidor ya filtrada y ordenada). */
  readonly result = signal<PageResponse<Loan> | null>(null);
  /** Contadores por estado para pestañas e indicadores. */
  readonly summary = signal<LoanSummary | null>(null);
  /** Hay una página en camino (la tabla anterior se muestra atenuada). */
  readonly fetching = signal(false);
  readonly members = signal<Member[]>([]);
  readonly availableBooks = signal<Book[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);

  // Modales
  readonly isModalOpen = signal(false);
  readonly returnDialogOpen = signal(false);
  readonly loanToReturn = signal<Loan | null>(null);
  readonly returning = signal(false);

  // Filtros
  readonly searchTerm = signal('');
  readonly statusFilter = signal<LoanFilterStatus>('ALL');
  /** Por defecto, los préstamos más recientes primero. */
  readonly sortField = signal<LoanSortField>('loanDate');
  readonly sortOrder = signal<SortOrder>('desc');
  readonly page = signal(0);
  readonly pageSize = signal(10);
  /** Texto de búsqueda ya aplicado (se actualiza 300 ms después de dejar de escribir). */
  private readonly appliedSearch = signal('');
  /** Se incrementa para volver a pedir la página actual (tras prestar o devolver). */
  private readonly refreshTick = signal(0);
  private searchTimer?: ReturnType<typeof setTimeout>;

  /** Opciones del menú para préstamos activos o vencidos (referencia estable para OnPush). */
  readonly activeLoanActions: ActionMenuItem[] = [
    { id: 'renew', label: 'Renovar (14 días desde hoy)', icon: 'refresh' },
    { id: 'return', label: 'Registrar devolución', icon: 'return' },
  ];
  /** Un préstamo vencido no se renueva: solo se puede devolver. */
  readonly overdueLoanActions: ActionMenuItem[] = [
    { id: 'return', label: 'Registrar devolución', icon: 'return' },
  ];

  /** Préstamo que se va a renovar (diálogo de confirmación). */
  readonly loanToRenew = signal<Loan | null>(null);
  readonly renewing = signal(false);
  /** Motivo por el que falló la renovación (se muestra dentro del diálogo). */
  readonly renewError = signal<string | null>(null);
  /**
   * Si hoy no se puede renovar el préstamo elegido, el motivo; el diálogo pasa a ser
   * informativo. El servidor aplica la misma regla.
   */
  readonly renewBlocked = computed(() => {
    const loan = this.loanToRenew();
    return loan ? this.renewBlockedReason(loan) : null;
  });

  /** Préstamo cuyo historial de renovaciones se está viendo, y el historial cargado. */
  readonly historyLoan = signal<Loan | null>(null);
  readonly history = signal<LoanRenewalHistory | null>(null);
  /** Aviso de préstamo repetido (el usuario ya tiene ese libro sin devolver). */
  readonly repeat = signal<LoanRepeat | null>(null);

  /** Usuarios como opciones del buscador (el valor es el id en texto, igual que el formulario). */
  readonly memberOptions = computed<ComboboxOption<string>[]>(() =>
    this.members().map((m) => ({ value: String(m.id), label: m.name, description: m.email })),
  );

  /**
   * Libros con ejemplares disponibles como opciones del buscador. El autor va en la descripción,
   * así también se puede buscar por autor.
   */
  readonly bookOptions = computed<ComboboxOption<string>[]>(() =>
    this.availableBooks().map((b) => ({
      value: String(b.id),
      label: b.title,
      description: `${b.author} · ${b.availableCopies} ${b.availableCopies === 1 ? 'disponible' : 'disponibles'}`,
    })),
  );

  readonly form = this.fb.group({
    memberId: this.fb.control<string | null>(null, Validators.required),
    bookId: this.fb.control<string | null>(null, Validators.required),
  });

  // Computed counters
  readonly totalLoansCount = computed(() => this.summary()?.total ?? 0);
  readonly activeLoansCount = computed(() => this.summary()?.active ?? 0);
  readonly overdueLoansCount = computed(() => this.summary()?.overdue ?? 0);
  readonly returnedLoansCount = computed(() => this.summary()?.returned ?? 0);

  readonly pageItems = computed(() => this.result()?.content ?? []);

  /** Consulta completa al servidor: cualquier cambio de filtro, orden o página la vuelve a lanzar. */
  private readonly request = computed(() => ({
    params: {
      status: this.statusFilter(),
      q: this.appliedSearch(),
      sort: this.sortField(),
      direction: this.sortOrder(),
      page: this.page(),
      size: this.pageSize(),
    } satisfies LoanQueryParams,
    tick: this.refreshTick(),
  }));

  constructor() {
    // switchMap cancela la petición anterior si el usuario cambia de filtro o página antes de
    // que llegue la respuesta, así nunca se pinta una página "vieja" encima de la nueva.
    toObservable(this.request)
      .pipe(
        tap(() => this.fetching.set(true)),
        switchMap(({ params }) => this.api.searchLoans(params).pipe(catchError(() => of(null)))),
        takeUntilDestroyed(),
      )
      .subscribe((page) => {
        this.fetching.set(false);
        this.loading.set(false);
        if (!page) return;
        // Si la página quedó vacía (p. ej. se devolvió el último préstamo de la última página),
        // se retrocede a la última página que sí existe.
        if (page.content.length === 0 && page.page > 0 && page.totalPages > 0) {
          this.page.set(page.totalPages - 1);
          return;
        }
        this.result.set(page);
      });
  }

  ngOnInit(): void {
    this.load();
  }

  invalid(name: 'memberId' | 'bookId'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  statusLabel(s: LoanStatus): string {
    switch (s) {
      case 'ACTIVE':
        return 'Activo';
      case 'OVERDUE':
        return 'Vencido';
      case 'RETURNED':
        return 'Devuelto';
    }
  }

  statusClass(s: LoanStatus): string {
    switch (s) {
      case 'ACTIVE':
        return 'badge ok';
      case 'OVERDUE':
        return 'badge bad';
      case 'RETURNED':
        return 'badge muted';
    }
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const value = target?.value ?? '';
    this.searchTerm.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.appliedSearch.set(value.trim());
      this.page.set(0);
    }, 300);
  }

  clearSearch(): void {
    clearTimeout(this.searchTimer);
    this.searchTerm.set('');
    this.appliedSearch.set('');
    this.page.set(0);
  }

  /** Cambiar de filtro vuelve a la primera página. */
  setStatus(status: LoanFilterStatus): void {
    this.statusFilter.set(status);
    this.page.set(0);
  }

  goToPage(page: number): void {
    this.page.set(page);
    document.querySelector('.loans-section')?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(0);
  }

  toggleSort(field: LoanSortField): void {
    if (this.sortField() === field) {
      this.sortOrder.update((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortField.set(field);
      // Las fechas empiezan por la más reciente; los textos, de la A a la Z.
      this.sortOrder.set(field === 'loanDate' || field === 'dueDate' ? 'desc' : 'asc');
    }
    this.page.set(0);
  }

  getSortIcon(field: LoanSortField): 'sort' | 'arrow-up' | 'arrow-down' {
    if (this.sortField() !== field) return 'sort';
    return this.sortOrder() === 'asc' ? 'arrow-up' : 'arrow-down';
  }

  resetFilters(): void {
    clearTimeout(this.searchTimer);
    this.searchTerm.set('');
    this.appliedSearch.set('');
    this.statusFilter.set('ALL');
    this.page.set(0);
  }

  load(): void {
    this.loading.set(true);
    // La página del historial la pide la consulta reactiva; aquí se recargan los datos auxiliares.
    this.refreshTick.update((n) => n + 1);
    forkJoin({
      summary: this.api.loanSummary(),
      members: this.api.listMembers(),
      books: this.api.listBooks(),
    }).subscribe({
      next: ({ summary, members, books }) => {
        this.summary.set(summary);
        this.members.set(members);
        this.availableBooks.set(books.filter((b) => b.available));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreateModal(): void {
    this.form.reset();
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.form.reset();
  }

  lend(): void {
    if (this.form.invalid) {
      this.isModalOpen.set(true);
      this.form.markAllAsTouched();
      return;
    }
    const memberId = Number(this.form.getRawValue().memberId);
    const bookId = Number(this.form.getRawValue().bookId);
    // Antes de prestar se comprueba si el usuario ya tiene ese libro sin devolver.
    this.saving.set(true);
    this.api.activeLoansFor(memberId, bookId).subscribe({
      next: (existing) => {
        this.saving.set(false);
        if (existing.length === 0) {
          this.doLend(bookId, memberId);
          return;
        }
        this.repeat.set({
          memberName: this.members().find((m) => m.id === memberId)?.name ?? existing[0].memberName,
          bookTitle: existing[0].bookTitle,
          existing,
        });
      },
      error: () => this.saving.set(false),
    });
  }

  /** El usuario confirma que quiere otro préstamo del mismo libro. */
  confirmRepeatLend(): void {
    const memberId = Number(this.form.getRawValue().memberId);
    const bookId = Number(this.form.getRawValue().bookId);
    this.repeat.set(null);
    this.doLend(bookId, memberId);
  }

  /** En lugar de prestar otro, renueva el préstamo que ya tenía. */
  renewFromRepeat(loan: Loan): void {
    this.renewing.set(true);
    this.api.renewLoan(loan.id).subscribe({
      next: (renewed) => {
        this.renewing.set(false);
        this.repeat.set(null);
        this.closeModal();
        this.notifyRenewed(renewed);
        this.load();
      },
      error: () => this.renewing.set(false),
    });
  }

  /** Abre la confirmación de renovación desde el menú ⋮. */
  promptRenew(loan: Loan): void {
    this.renewError.set(null);
    this.loanToRenew.set(loan);
  }

  confirmRenew(): void {
    const loan = this.loanToRenew();
    if (!loan || this.renewBlocked()) return;
    this.renewError.set(null);
    this.renewing.set(true);
    this.api.renewLoan(loan.id, true).subscribe({
      next: (renewed) => {
        this.renewing.set(false);
        this.loanToRenew.set(null);
        this.notifyRenewed(renewed);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.renewing.set(false);
        this.renewError.set(messageFor(err));
      },
    });
  }

  /**
   * Un préstamo se renueva como mucho una vez al día, y uno registrado hoy ya tiene el plazo
   * completo. Devuelve el motivo para informarlo sin llamar al servidor, o {@code null}.
   */
  private renewBlockedReason(loan: Loan): string | null {
    const today = this.todayIso();
    const due = this.formatDate(loan.dueDate);
    if (loan.lastRenewedOn === today) {
      const at = loan.lastRenewedAt ? ` a las ${loan.lastRenewedAt.slice(11, 16)}` : '';
      return `El préstamo de ${loan.bookTitle} ya se renovó hoy${at} y vence el ${due}. Podrá renovarse de nuevo a partir de mañana.`;
    }
    if (loan.loanDate === today) {
      return `El préstamo de ${loan.bookTitle} se registró hoy y ya tiene el plazo completo (vence el ${due}). Podrá renovarse a partir de mañana.`;
    }
    return null;
  }

  /** Abre el historial de renovaciones (préstamo inicial y cada renovación). */
  openHistory(loan: Loan): void {
    this.history.set(null);
    this.historyLoan.set(loan);
    this.api.renewalHistory(loan.id).subscribe({
      next: (h) => {
        if (this.historyLoan()?.id === loan.id) this.history.set(h);
      },
      error: () => this.historyLoan.set(null),
    });
  }

  /** Fecha local de hoy en formato ISO ("2026-10-07"). */
  private todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private notifyRenewed(loan: Loan): void {
    this.notify.ok(`Préstamo de «${loan.bookTitle}» renovado: ahora vence el ${this.formatDate(loan.dueDate)}`);
  }

  private doLend(bookId: number, memberId: number): void {
    this.saving.set(true);
    this.api.lend(bookId, memberId).subscribe({
      next: (loan) => {
        this.notify.ok(`Préstamo registrado, vence el ${loan.dueDate}`);
        this.closeModal();
        this.saving.set(false);
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  /** Despacha la opción elegida en el menú de acciones de un préstamo. */
  onAction(action: string, loan: Loan): void {
    if (action === 'return') {
      this.promptReturn(loan);
    } else if (action === 'renew') {
      this.promptRenew(loan);
    }
  }

  promptReturn(loan: Loan): void {
    this.loanToReturn.set(loan);
    this.returnDialogOpen.set(true);
  }

  confirmReturn(): void {
    const loan = this.loanToReturn();
    if (!loan) return;

    this.returning.set(true);
    this.api.giveBack(loan.id).subscribe({
      next: () => {
        this.notify.ok('Devolución registrada');
        this.returnDialogOpen.set(false);
        this.loanToReturn.set(null);
        this.returning.set(false);
        this.load();
      },
      error: () => {
        this.returning.set(false);
      },
    });
  }

  cancelReturn(): void {
    this.returnDialogOpen.set(false);
    this.loanToReturn.set(null);
  }

  giveBack(loan: Loan): void {
    this.promptReturn(loan);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      const [year, month, day] = dateStr.split('-');
      if (year && month && day) {
        return `${day}/${month}/${year}`;
      }
    } catch {
      // fallback
    }
    return dateStr;
  }

  getDaysRelativeText(dueDateStr: string, status: LoanStatus): string {
    if (status === 'RETURNED' || !dueDateStr) return '';
    const now = new Date();
    const [year, month, day] = dueDateStr.split('-').map(Number);
    const due = new Date(year, month - 1, day);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const daysOverdue = Math.abs(diffDays);
      return `Vencido hace ${daysOverdue} ${daysOverdue === 1 ? 'día' : 'días'}`;
    } else if (diffDays === 0) {
      return 'Vence hoy';
    } else if (diffDays === 1) {
      return 'Vence mañana';
    } else {
      return `Quedan ${diffDays} días`;
    }
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
}
