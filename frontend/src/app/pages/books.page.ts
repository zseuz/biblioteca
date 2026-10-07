import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../core/api.service';
import { messageFor } from '../core/error.interceptor';
import { Book, Member } from '../core/models';
import { NotifyService } from '../core/notify.service';
import { ActionMenuComponent, ActionMenuItem } from '../shared/action-menu.component';
import { ComboboxComponent, ComboboxOption } from '../shared/combobox.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';
import { EmptyStateComponent } from '../shared/empty-state.component';
import { IconComponent } from '../shared/icon.component';
import { ModalComponent } from '../shared/modal.component';
import { SkeletonComponent } from '../shared/skeleton.component';

export type BookSortField = 'title' | 'author' | 'genre' | 'availableCopies';
export type SortOrder = 'asc' | 'desc';
export type AvailabilityFilter = 'all' | 'available' | 'unavailable';

@Component({
  selector: 'app-books-page',
  imports: [
    ReactiveFormsModule,
    IconComponent,
    ActionMenuComponent,
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
        <h1 class="page-title">Catálogo de Libros</h1>
        <p class="page-desc">
          Administra el inventario de la biblioteca, consulta disponibilidad y registra préstamos.
        </p>
      </div>
      <button type="button" class="btn btn-primary" (click)="openCreate()">
        <app-icon name="plus" [size]="16" />
        Nuevo libro
      </button>
    </div>

    <!-- Métricas rápidas del catálogo -->
    <div class="kpi-strip">
      <div class="kpi-chip">
        <div class="kpi-chip-icon"><app-icon name="book" [size]="18" /></div>
        <div>
          <span class="kpi-chip-val">{{ totalBooksCount() }}</span>
          <span class="kpi-chip-lbl">Títulos registrados</span>
        </div>
      </div>
      <div class="kpi-chip">
        <div class="kpi-chip-icon success"><app-icon name="check" [size]="18" /></div>
        <div>
          <span class="kpi-chip-val">{{ totalAvailableCopies() }}</span>
          <span class="kpi-chip-lbl">Copias disponibles</span>
        </div>
      </div>
      <div class="kpi-chip">
        <div class="kpi-chip-icon warn"><app-icon name="loans" [size]="18" /></div>
        <div>
          <span class="kpi-chip-val">{{ totalBorrowedCopies() }}</span>
          <span class="kpi-chip-lbl">Copias prestadas</span>
        </div>
      </div>
    </div>

    <!-- Barra de herramientas: Búsqueda, Filtros y Vista -->
    <div class="toolbar card">
      <div class="toolbar-left">
        <div class="search-input-wrap">
          <app-icon name="search" [size]="16" class="search-icon" />
          <label for="search" class="sr-only">Buscar</label>
          <input
            id="search"
            type="search"
            placeholder="Buscar por título, autor o género..."
            [value]="query()"
            (input)="onSearchInput($event)"
          />
          @if (query()) {
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

        <div class="select-filter-wrap">
          <app-icon name="filter" [size]="14" class="filter-icon" />
          <select
            [value]="genreFilter()"
            (change)="onGenreChange($event)"
            aria-label="Filtrar por género"
          >
            <option value="all">Todos los géneros</option>
            @for (g of genres(); track g) {
              <option [value]="g">{{ g }}</option>
            }
          </select>
        </div>
      </div>

      <div class="toolbar-right">
        <div class="filter-pills" role="radiogroup" aria-label="Filtro de disponibilidad">
          <button
            type="button"
            class="pill-btn"
            [class.active]="availFilter() === 'all'"
            (click)="availFilter.set('all')"
          >
            Todos ({{ books().length }})
          </button>
          <button
            type="button"
            class="pill-btn"
            [class.active]="availFilter() === 'available'"
            (click)="availFilter.set('available')"
          >
            Disponibles ({{ availableCount() }})
          </button>
          <button
            type="button"
            class="pill-btn"
            [class.active]="availFilter() === 'unavailable'"
            (click)="availFilter.set('unavailable')"
          >
            Agotados ({{ unavailableCount() }})
          </button>
        </div>

        <div class="view-toggles" role="group" aria-label="Tipo de vista">
          <button
            type="button"
            class="view-btn"
            [class.active]="viewMode() === 'table'"
            (click)="viewMode.set('table')"
            title="Vista de tabla"
            aria-label="Vista de tabla"
          >
            <app-icon name="table" [size]="16" />
          </button>
          <button
            type="button"
            class="view-btn"
            [class.active]="viewMode() === 'grid'"
            (click)="viewMode.set('grid')"
            title="Vista de tarjetas"
            aria-label="Vista de tarjetas"
          >
            <app-icon name="grid" [size]="16" />
          </button>
        </div>
      </div>
    </div>

    <!-- Contenido: Lista o Grid -->
    <section class="catalog-section" aria-labelledby="catalog-heading">
      <h2 id="catalog-heading" class="sr-only">Catálogo de libros</h2>

      @if (loading()) {
        <div class="card p-3">
          <div class="skeleton-stack">
            <app-skeleton height="2.2rem" />
            <app-skeleton height="2.2rem" />
            <app-skeleton height="2.2rem" />
            <app-skeleton height="2.2rem" />
          </div>
        </div>
      } @else if (filteredBooks().length === 0) {
        @if (books().length === 0) {
          <app-empty-state
            icon="book"
            title="No hay libros registrados"
            message="El catálogo está actualmente vacío. Comienza agregando tu primer libro."
            actionLabel="Agregar libro"
            (action)="openCreate()"
          />
        } @else {
          <app-empty-state
            icon="search"
            title="Sin resultados"
            message="No se encontraron libros que coincidan con los filtros y búsqueda aplicados."
            actionLabel="Limpiar filtros"
            (action)="resetFilters()"
          />
        }
      } @else if (viewMode() === 'table') {
        <!-- Vista Tabla -->
        <div class="table-wrap">
          <table class="books-table">
            <caption class="sr-only">
              Lista de libros
            </caption>
            <thead>
              <tr>
                <th class="sortable" (click)="toggleSort('title')">
                  Título
                  <span class="sort-icon">
                    <app-icon [name]="getSortIcon('title')" [size]="13" />
                  </span>
                </th>
                <th class="sortable col-author" (click)="toggleSort('author')">
                  Autor
                  <span class="sort-icon">
                    <app-icon [name]="getSortIcon('author')" [size]="13" />
                  </span>
                </th>
                <th class="sortable" (click)="toggleSort('genre')">
                  Género
                  <span class="sort-icon">
                    <app-icon [name]="getSortIcon('genre')" [size]="13" />
                  </span>
                </th>
                <th class="sortable" (click)="toggleSort('availableCopies')">
                  Disponibles
                  <span class="sort-icon">
                    <app-icon [name]="getSortIcon('availableCopies')" [size]="13" />
                  </span>
                </th>
                <th>Estado</th>
                <th class="col-actions"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (b of filteredBooks(); track b.id) {
                <tr>
                  <td class="col-title">
                    <div class="book-cell">
                      <div class="book-mini-cover"><app-icon name="book" [size]="15" /></div>
                      <div class="book-cell-text">
                        <strong class="book-cell-title">{{ b.title }}</strong>
                        <!-- Visible solo cuando la columna Autor se oculta (pantallas medianas y móvil) -->
                        <span class="book-cell-author">{{ b.author }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="col-author">{{ b.author }}</td>
                  <td class="col-genre" data-label="Género">
                    <span class="genre-tag">{{ b.genre }}</span>
                  </td>
                  <td class="col-copies" data-label="Disponibles">
                    <div class="copies-cell">
                      <span class="copies-num" [class.empty-stock]="b.availableCopies === 0">
                        {{ b.availableCopies }} / {{ b.totalCopies }}
                      </span>
                      <div class="copies-bar">
                        <div
                          class="copies-bar-fill"
                          [style.width.%]="(b.availableCopies / b.totalCopies) * 100"
                          [class.warn]="b.availableCopies === 1"
                          [class.zero]="b.availableCopies === 0"
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td class="col-status" data-label="Estado">
                    <span class="badge" [class.ok]="b.available" [class.bad]="!b.available">
                      <span class="dot"></span>
                      {{ b.available ? 'Disponible' : 'Agotado' }}
                    </span>
                  </td>
                  <td class="col-actions">
                    <app-action-menu
                      [items]="b.available ? actionsWithLoan : actionsWithoutLoan"
                      [label]="'Acciones para ' + b.title"
                      (selected)="onAction($event, b)"
                    />
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <!-- Vista Tarjetas (Grid) -->
        <div class="books-grid">
          @for (b of filteredBooks(); track b.id) {
            <article class="book-card card">
              <div class="book-card-top">
                <span class="genre-tag">{{ b.genre }}</span>
                <span class="badge" [class.ok]="b.available" [class.bad]="!b.available">
                  <span class="dot"></span>
                  {{ b.available ? 'Disponible' : 'Agotado' }}
                </span>
              </div>

              <div class="book-card-main">
                <div class="book-card-avatar">
                  <app-icon name="book" [size]="24" />
                </div>
                <div class="book-card-info">
                  <h3 class="book-card-title" [title]="b.title">{{ b.title }}</h3>
                  <p class="book-card-author">{{ b.author }}</p>
                </div>
              </div>

              <div class="book-card-stock">
                <div class="stock-labels">
                  <span>Disponibilidad</span>
                  <strong>{{ b.availableCopies }} de {{ b.totalCopies }} copias</strong>
                </div>
                <div class="copies-bar">
                  <div
                    class="copies-bar-fill"
                    [style.width.%]="(b.availableCopies / b.totalCopies) * 100"
                    [class.warn]="b.availableCopies === 1"
                    [class.zero]="b.availableCopies === 0"
                  ></div>
                </div>
              </div>

              <div class="book-card-actions">
                @if (b.availableCopies > 0) {
                  <button type="button" class="btn btn-sm btn-primary" (click)="openQuickLoan(b)">
                    <app-icon name="loans" [size]="14" />
                    Prestar
                  </button>
                }
                <app-action-menu
                  [items]="actionsWithoutLoan"
                  [label]="'Acciones para ' + b.title"
                  (selected)="onAction($event, b)"
                />
              </div>
            </article>
          }
        </div>
      }
    </section>

    <!-- Modal para Crear / Editar Libro -->
    <app-modal
      [open]="isModalOpen()"
      [title]="editing() ? 'Editar libro' : 'Nuevo libro'"
      [subtitle]="
        editing()
          ? 'Modifica los datos del ejemplar'
          : 'Ingresa la información para registrar el libro en el catálogo'
      "
      size="md"
      (close)="cancel()"
    >
      <form [formGroup]="form" (ngSubmit)="save()" id="book-form" novalidate>
        <div class="form-stack">
          <div class="form-group">
            <label for="title">Título del libro *</label>
            <input
              id="title"
              formControlName="title"
              placeholder="Ej. Cien años de soledad"
              [class.invalid]="invalid('title')"
              [attr.aria-invalid]="invalid('title')"
            />
            @if (invalid('title')) {
              <p class="error"><app-icon name="alert" [size]="13" /> El título es obligatorio.</p>
            }
          </div>

          <div class="form-group">
            <label for="author">Autor *</label>
            <input
              id="author"
              formControlName="author"
              placeholder="Ej. Gabriel García Márquez"
              [class.invalid]="invalid('author')"
              [attr.aria-invalid]="invalid('author')"
            />
            @if (invalid('author')) {
              <p class="error"><app-icon name="alert" [size]="13" /> El autor es obligatorio.</p>
            }
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="genre">Género literario *</label>
              <input
                id="genre"
                formControlName="genre"
                placeholder="Ej. Realismo mágico, Novela..."
                [class.invalid]="invalid('genre')"
                [attr.aria-invalid]="invalid('genre')"
              />
              @if (invalid('genre')) {
                <p class="error"><app-icon name="alert" [size]="13" /> El género es obligatorio.</p>
              }
            </div>

            <div class="form-group">
              <label for="copies">Número de ejemplares *</label>
              <input
                id="copies"
                type="number"
                min="1"
                formControlName="totalCopies"
                [class.invalid]="invalid('totalCopies')"
                [attr.aria-invalid]="invalid('totalCopies')"
              />
              @if (invalid('totalCopies')) {
                <p class="error">
                  <app-icon name="alert" [size]="13" /> Debe haber al menos 1 ejemplar.
                </p>
              }
            </div>
          </div>
        </div>
      </form>

      <div modal-actions>
        <button type="button" class="btn btn-secondary" (click)="cancel()" [disabled]="saving()">
          Cancelar
        </button>
        <button type="submit" form="book-form" class="btn btn-primary" [disabled]="saving()">
          @if (saving()) {
            <span class="spinner-sm"></span>
          }
          {{ editing() ? 'Guardar cambios' : 'Agregar libro' }}
        </button>
      </div>
    </app-modal>

    <!-- Modal de Confirmación de Eliminación -->
    <app-confirm-dialog
      [open]="deleteDialogOpen()"
      title="Eliminar libro"
      [message]="
        '¿Estás seguro de que deseas eliminar «' +
        (bookToDelete()?.title ?? '') +
        '»? Esta acción no se puede deshacer.'
      "
      confirmText="Eliminar"
      variant="danger"
      [loading]="deleting()"
      [error]="deleteError()"
      (confirm)="confirmDelete()"
      (cancel)="cancelDelete()"
    />

    <!-- Modal de Préstamo Rápido desde Catálogo -->
    <app-modal
      [open]="quickLoanModalOpen()"
      title="Registrar préstamo"
      [subtitle]="'Préstamo del libro: ' + (quickLoanBook()?.title ?? '')"
      size="md"
      (close)="quickLoanModalOpen.set(false)"
    >
      <div class="form-stack">
        <div class="loan-quick-summary">
          <strong>{{ quickLoanBook()?.title }}</strong>
          <span>{{ quickLoanBook()?.availableCopies }} copias disponibles actualmente</span>
        </div>

        <div class="form-group">
          <label for="quick-loan-member">Usuario que recibe el libro *</label>
          <app-combobox
            inputId="quick-loan-member"
            [formControl]="quickLoanMember"
            [options]="memberOptions()"
            placeholder="Escribe el nombre o correo, o despliega la lista..."
            emptyText="Ningún usuario coincide con la búsqueda"
          />
        </div>
      </div>

      <div modal-actions>
        <button type="button" class="btn btn-secondary" (click)="quickLoanModalOpen.set(false)">
          Cancelar
        </button>
        <button
          type="button"
          class="btn btn-primary"
          [disabled]="!selectedLoanMemberId() || quickLoanSubmitting()"
          (click)="submitQuickLoan()"
        >
          @if (quickLoanSubmitting()) {
            <span class="spinner-sm"></span>
          }
          Confirmar préstamo
        </button>
      </div>
    </app-modal>
  `,
  styles: `
    .select-filter-wrap {
      position: relative;
    }
    .select-filter-wrap select {
      padding-left: 2rem;
      min-width: 170px;
    }
    .filter-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--muted);
      pointer-events: none;
    }
    .book-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .book-mini-cover {
      width: 32px;
      height: 38px;
      border-radius: var(--radius-sm);
      background: var(--primary-light);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .book-cell-title {
      display: block;
      font-weight: 600;
      color: var(--text);
    }
    .genre-tag {
      display: inline-block;
      font-size: 0.775rem;
      font-weight: 600;
      color: var(--muted);
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      padding: 0.15rem 0.55rem;
      border-radius: var(--radius-sm);
    }
    .copies-cell {
      min-width: 120px;
    }
    .copies-num {
      font-weight: 600;
      font-size: 0.85rem;
      display: block;
      margin-bottom: 0.25rem;
    }
    .copies-num.empty-stock {
      color: var(--danger);
    }
    .copies-bar {
      height: 6px;
      background: var(--hover);
      border-radius: var(--radius-full);
      overflow: hidden;
    }
    .copies-bar-fill {
      height: 100%;
      background: var(--ok);
      border-radius: var(--radius-full);
      transition: width 0.3s ease;
    }
    .copies-bar-fill.warn {
      background: var(--warn);
    }
    .copies-bar-fill.zero {
      background: var(--danger);
    }
    .books-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.25rem;
    }
    .book-card {
      margin-bottom: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1rem;
      transition:
        transform 0.2s ease,
        box-shadow 0.2s ease;
    }
    .book-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    .book-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }
    .book-card-main {
      display: flex;
      gap: 0.85rem;
      align-items: flex-start;
    }
    .book-card-avatar {
      width: 44px;
      height: 52px;
      border-radius: var(--radius-sm);
      background: linear-gradient(135deg, var(--primary-light), var(--hover));
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: var(--shadow-xs);
    }
    .book-card-info {
      flex: 1;
      min-width: 0;
    }
    .book-card-title {
      font-size: 1.05rem;
      font-weight: 700;
      line-height: 1.3;
      margin: 0 0 0.25rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .book-card-author {
      font-size: 0.85rem;
      color: var(--muted);
      margin: 0;
    }
    .book-card-stock {
      background: var(--surface-subtle);
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-md);
    }
    .stock-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.775rem;
      color: var(--muted);
      margin-bottom: 0.35rem;
    }
    .stock-labels strong {
      color: var(--text);
    }
    .book-card-actions {
      display: flex;
      gap: 0.45rem;
      align-items: center;
      justify-content: flex-end;
    }
    /* ---- Tabla de libros adaptable (sin scroll horizontal) ---- */
    .books-table td {
      white-space: normal;
    }
    .books-table .col-title {
      min-width: 180px;
    }
    .book-cell-text {
      min-width: 0;
    }
    .book-cell-author {
      display: none;
      font-size: 0.8rem;
      color: var(--muted);
    }
    .books-table .col-actions {
      width: 1%;
      text-align: right;
      padding-left: 0.25rem;
      padding-right: 0.75rem;
    }

    /* Pantallas medianas: la columna Autor pasa a mostrarse bajo el título. */
    @media (max-width: 1100px) {
      .books-table .col-author {
        display: none;
      }
      .book-cell-author {
        display: block;
      }
      .books-table th,
      .books-table td {
        padding-left: 0.75rem;
        padding-right: 0.75rem;
      }
    }

    /* Móvil: cada fila se convierte en una tarjeta compacta. */
    @media (max-width: 720px) {
      .books-table thead {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
      }
      .books-table,
      .books-table tbody {
        display: block;
      }
      .books-table tr {
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-areas:
          'title actions'
          'genre status'
          'copies copies';
        gap: 0.6rem 0.75rem;
        padding: 0.9rem 0.85rem;
        border-bottom: 1px solid var(--border);
      }
      .books-table tbody tr:last-child {
        border-bottom: 0;
      }
      .books-table td {
        display: block;
        padding: 0;
        border: 0;
      }
      .books-table .col-title {
        grid-area: title;
        min-width: 0;
      }
      .books-table .col-actions {
        grid-area: actions;
        width: auto;
        padding: 0;
      }
      .books-table .col-genre {
        grid-area: genre;
        align-self: center;
      }
      .books-table .col-status {
        grid-area: status;
        justify-self: end;
        align-self: center;
      }
      .books-table .col-copies {
        grid-area: copies;
      }
      .copies-cell {
        min-width: 0;
      }
    }

    .loan-quick-summary {
      background: var(--primary-light);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      color: var(--text);
      font-size: 0.88rem;
    }
  `,
})
export class BooksPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private searchTimer?: ReturnType<typeof setTimeout>;

  readonly books = signal<Book[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal<Book | null>(null);
  readonly query = signal('');

  // Modales
  readonly isModalOpen = signal(false);
  readonly deleteDialogOpen = signal(false);
  readonly bookToDelete = signal<Book | null>(null);
  readonly deleting = signal(false);
  /** Motivo por el que el servidor rechazó la baja (p. ej. historial); se ve dentro del diálogo. */
  readonly deleteError = signal<string | null>(null);

  // Filtros y Vista
  readonly genreFilter = signal<string>('all');
  readonly availFilter = signal<AvailabilityFilter>('all');
  readonly viewMode = signal<'table' | 'grid'>('table');
  readonly sortField = signal<BookSortField>('title');
  readonly sortOrder = signal<SortOrder>('asc');

  // Préstamo Rápido
  readonly quickLoanModalOpen = signal(false);
  readonly quickLoanBook = signal<Book | null>(null);
  /** Usuario elegido en el buscador del préstamo rápido. */
  readonly quickLoanMember = new FormControl<number | null>(null, Validators.required);
  /** Espejo en signal del valor anterior, para habilitar el botón con OnPush. */
  readonly selectedLoanMemberId = toSignal(this.quickLoanMember.valueChanges, { initialValue: null });
  readonly memberOptions = computed<ComboboxOption[]>(() =>
    this.membersList().map((m) => ({ value: m.id, label: m.name, description: m.email })),
  );
  readonly membersList = signal<Member[]>([]);
  readonly quickLoanSubmitting = signal(false);

  // Opciones del menú de acciones. Son constantes (misma referencia en cada render) para que
  // el componente OnPush del menú no se vuelva a evaluar sin necesidad.
  readonly actionsWithoutLoan: ActionMenuItem[] = [
    { id: 'edit', label: 'Editar', icon: 'edit' },
    { id: 'delete', label: 'Eliminar', icon: 'trash', danger: true },
  ];
  readonly actionsWithLoan: ActionMenuItem[] = [
    { id: 'lend', label: 'Prestar', icon: 'loans' },
    ...this.actionsWithoutLoan,
  ];

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    author: ['', [Validators.required, Validators.maxLength(150)]],
    genre: ['', [Validators.required, Validators.maxLength(80)]],
    totalCopies: [1, [Validators.required, Validators.min(1)]],
  });

  // Computed state
  readonly genres = computed(() => {
    const list = this.books().map((b) => b.genre);
    return Array.from(new Set(list)).filter(Boolean).sort();
  });

  readonly totalBooksCount = computed(() => this.books().length);

  readonly totalAvailableCopies = computed(() =>
    this.books().reduce((acc, b) => acc + b.availableCopies, 0),
  );

  readonly totalBorrowedCopies = computed(() =>
    this.books().reduce((acc, b) => acc + (b.totalCopies - b.availableCopies), 0),
  );

  readonly availableCount = computed(() => this.books().filter((b) => b.available).length);

  readonly unavailableCount = computed(() => this.books().filter((b) => !b.available).length);

  readonly filteredBooks = computed(() => {
    let result = [...this.books()];
    const genre = this.genreFilter();
    const avail = this.availFilter();
    const field = this.sortField();
    const order = this.sortOrder();

    if (genre !== 'all') {
      result = result.filter((b) => b.genre.toLowerCase() === genre.toLowerCase());
    }

    if (avail === 'available') {
      result = result.filter((b) => b.available);
    } else if (avail === 'unavailable') {
      result = result.filter((b) => !b.available);
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (field === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (field === 'author') {
        comparison = a.author.localeCompare(b.author);
      } else if (field === 'genre') {
        comparison = a.genre.localeCompare(b.genre);
      } else if (field === 'availableCopies') {
        comparison = a.availableCopies - b.availableCopies;
      }
      return order === 'asc' ? comparison : -comparison;
    });

    return result;
  });

  ngOnInit(): void {
    this.load();
  }

  invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.onSearch(target?.value ?? '');
  }

  onSearch(value: string): void {
    this.query.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 250);
  }

  clearSearch(): void {
    this.onSearch('');
  }

  onGenreChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    this.genreFilter.set(select?.value ?? 'all');
  }

  resetFilters(): void {
    this.query.set('');
    this.genreFilter.set('all');
    this.availFilter.set('all');
    this.load();
  }

  toggleSort(field: BookSortField): void {
    if (this.sortField() === field) {
      this.sortOrder.update((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortField.set(field);
      this.sortOrder.set('asc');
    }
  }

  getSortIcon(field: BookSortField): 'sort' | 'arrow-up' | 'arrow-down' {
    if (this.sortField() !== field) return 'sort';
    return this.sortOrder() === 'asc' ? 'arrow-up' : 'arrow-down';
  }

  load(): void {
    this.loading.set(true);
    this.api.listBooks(this.query()).subscribe({
      next: (books) => {
        this.books.set(books);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ title: '', author: '', genre: '', totalCopies: 1 });
    this.isModalOpen.set(true);
    setTimeout(() => document.getElementById('title')?.focus(), 50);
  }

  save(): void {
    if (this.form.invalid) {
      this.isModalOpen.set(true);
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const current = this.editing();
    const request = current ? this.api.updateBook(current.id, value) : this.api.createBook(value);
    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.notify.ok(current ? 'Libro actualizado' : 'Libro agregado');
        this.cancel();
        this.saving.set(false);
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  edit(book: Book): void {
    this.editing.set(book);
    this.form.setValue({
      title: book.title,
      author: book.author,
      genre: book.genre,
      totalCopies: book.totalCopies,
    });
    this.isModalOpen.set(true);
    setTimeout(() => document.getElementById('title')?.focus(), 50);
  }

  cancel(): void {
    this.isModalOpen.set(false);
    this.editing.set(null);
    this.form.reset({ title: '', author: '', genre: '', totalCopies: 1 });
  }

  /** Despacha la opción elegida en el menú de acciones de un libro. */
  onAction(action: string, book: Book): void {
    switch (action) {
      case 'lend':
        this.openQuickLoan(book);
        break;
      case 'edit':
        this.edit(book);
        break;
      case 'delete':
        this.remove(book);
        break;
    }
  }

  remove(book: Book): void {
    this.bookToDelete.set(book);
    this.deleteError.set(null);
    this.deleteDialogOpen.set(true);
  }

  confirmDelete(): void {
    const b = this.bookToDelete();
    if (!b) return;

    this.deleting.set(true);
    this.deleteError.set(null);
    this.api.deleteBook(b.id).subscribe({
      next: () => {
        this.notify.ok('Libro eliminado');
        this.deleteDialogOpen.set(false);
        this.bookToDelete.set(null);
        this.deleting.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.deleting.set(false);
        this.deleteError.set(messageFor(err));
      },
    });
  }

  cancelDelete(): void {
    this.deleteDialogOpen.set(false);
    this.bookToDelete.set(null);
    this.deleteError.set(null);
  }

  openQuickLoan(book: Book): void {
    this.quickLoanBook.set(book);
    this.quickLoanMember.reset(null);
    this.quickLoanModalOpen.set(true);
    // Carga lista de usuarios si no está cargada
    if (this.membersList().length === 0) {
      this.api.listMembers().subscribe({
        next: (list) => this.membersList.set(list),
      });
    }
  }

  submitQuickLoan(): void {
    const book = this.quickLoanBook();
    const memberId = this.quickLoanMember.value;
    if (!book || !memberId) return;

    this.quickLoanSubmitting.set(true);
    this.api.lend(book.id, memberId).subscribe({
      next: (loan) => {
        this.notify.ok(`Préstamo registrado exitosamente, vence el ${loan.dueDate}`);
        this.quickLoanModalOpen.set(false);
        this.quickLoanBook.set(null);
        this.quickLoanSubmitting.set(false);
        this.load();
      },
      error: () => {
        this.quickLoanSubmitting.set(false);
      },
    });
  }
}
