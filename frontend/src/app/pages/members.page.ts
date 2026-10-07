import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../core/api.service';
import { messageFor } from '../core/error.interceptor';
import { Member } from '../core/models';
import { NAME_MAX, nameWarnings, notBlank } from '../core/member-name';
import { NotifyService } from '../core/notify.service';
import { ActionMenuComponent, ActionMenuItem } from '../shared/action-menu.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';
import { EmptyStateComponent } from '../shared/empty-state.component';
import { IconComponent } from '../shared/icon.component';
import { ModalComponent } from '../shared/modal.component';
import { SkeletonComponent } from '../shared/skeleton.component';

export type MemberSortField = 'name' | 'email';
export type SortOrder = 'asc' | 'desc';

@Component({
  selector: 'app-members-page',
  imports: [
    ReactiveFormsModule,
    IconComponent,
    ActionMenuComponent,
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
        <h1 class="page-title">Usuarios y Lectores</h1>
        <p class="page-desc">
          Administra el padrón de socios, sus correos de contacto y registro de préstamos.
        </p>
      </div>
      <button type="button" class="btn btn-primary" (click)="openCreate()">
        <app-icon name="plus" [size]="16" />
        Nuevo usuario
      </button>
    </div>

    <!-- Barra de métricas y herramientas -->
    <div class="kpi-strip">
      <div class="kpi-chip">
        <div class="kpi-chip-icon"><app-icon name="users" [size]="18" /></div>
        <div>
          <span class="kpi-chip-val">{{ members().length }}</span>
          <span class="kpi-chip-lbl">Usuarios registrados</span>
        </div>
      </div>
    </div>

    <div class="toolbar card">
      <div class="toolbar-left">
        <div class="search-input-wrap">
          <app-icon name="search" [size]="16" class="search-icon" />
          <label for="search-members" class="sr-only">Buscar usuarios</label>
          <input
            id="search-members"
            type="search"
            placeholder="Buscar por nombre o correo electrónico..."
            [value]="searchTerm()"
            (input)="onSearchInput($event)"
          />
          @if (searchTerm()) {
            <button
              type="button"
              class="clear-search-btn"
              (click)="searchTerm.set('')"
              aria-label="Limpiar búsqueda"
            >
              <app-icon name="close" [size]="14" />
            </button>
          }
        </div>
      </div>

      <div class="toolbar-right">
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

    <!-- Contenido -->
    <section class="members-section" aria-labelledby="members-heading">
      <h2 id="members-heading" class="sr-only">Listado de usuarios</h2>

      @if (loading()) {
        <div class="card p-3">
          <div class="skeleton-stack">
            <app-skeleton height="2.2rem" />
            <app-skeleton height="2.2rem" />
            <app-skeleton height="2.2rem" />
          </div>
        </div>
      } @else if (filteredMembers().length === 0) {
        @if (members().length === 0) {
          <app-empty-state
            icon="users"
            title="No hay usuarios registrados"
            message="Aún no hay socios en la base de datos. Comienza agregando al primer usuario."
            actionLabel="Agregar usuario"
            (action)="openCreate()"
          />
        } @else {
          <app-empty-state
            icon="search"
            title="Sin resultados"
            message="No se encontraron socios que coincidan con la búsqueda."
            actionLabel="Limpiar búsqueda"
            (action)="searchTerm.set('')"
          />
        }
      } @else if (viewMode() === 'table') {
        <div class="table-wrap">
          <table class="members-table">
            <caption class="sr-only">
              Lista de usuarios
            </caption>
            <thead>
              <tr>
                <th class="sortable" (click)="toggleSort('name')">
                  Nombre
                  <span class="sort-icon">
                    <app-icon [name]="getSortIcon('name')" [size]="13" />
                  </span>
                </th>
                <th class="sortable col-email" (click)="toggleSort('email')">
                  Correo electrónico
                  <span class="sort-icon">
                    <app-icon [name]="getSortIcon('email')" [size]="13" />
                  </span>
                </th>
                <th class="col-actions"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (m of filteredMembers(); track m.id) {
                <tr>
                  <td>
                    <div class="user-cell">
                      <div class="user-avatar" [style.background-color]="getAvatarBg(m.name)">
                        {{ getInitials(m.name) }}
                      </div>
                      <div class="user-text">
                        <strong class="user-name">{{ m.name }}</strong>
                        <!-- En móvil el correo se muestra aquí y se oculta su columna -->
                        <span class="user-email-inline">{{ m.email }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="col-email">
                    <a [href]="'mailto:' + m.email" class="email-link">
                      {{ m.email }}
                    </a>
                  </td>
                  <td class="col-actions">
                    <app-action-menu
                      [items]="memberActions"
                      [label]="'Acciones para ' + m.name"
                      (selected)="onAction($event, m)"
                    />
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="members-grid">
          @for (m of filteredMembers(); track m.id) {
            <article class="member-card card">
              <div class="member-card-header">
                <div class="user-avatar-lg" [style.background-color]="getAvatarBg(m.name)">
                  {{ getInitials(m.name) }}
                </div>
                <div class="member-card-details">
                  <h3 class="member-card-name">{{ m.name }}</h3>
                  <a [href]="'mailto:' + m.email" class="email-link-sm">{{ m.email }}</a>
                </div>
              </div>

              <div class="member-card-actions">
                <app-action-menu
                  [items]="memberActions"
                  [label]="'Acciones para ' + m.name"
                  (selected)="onAction($event, m)"
                />
              </div>
            </article>
          }
        </div>
      }
    </section>

    <!-- Modal para Crear / Editar Usuario -->
    <app-modal
      [open]="isModalOpen()"
      [title]="editing() ? 'Editar usuario' : 'Nuevo usuario'"
      [subtitle]="
        editing()
          ? 'Actualiza los datos del socio'
          : 'Ingresa la información básica para dar de alta al socio en el sistema'
      "
      size="sm"
      (close)="cancel()"
    >
      <form [formGroup]="form" (ngSubmit)="save()" id="member-form" novalidate>
        <div class="form-stack">
          <div class="form-group">
            <div class="label-row">
              <label for="name">Nombre completo *</label>
              <span class="char-count" [class.at-limit]="nameLength() >= nameMax" aria-hidden="true">
                {{ nameLength() }}/{{ nameMax }}
              </span>
            </div>
            <!-- maxlength/required: validación nativa del navegador (impide escribir de más);
                 los validadores de Angular y el backend vuelven a comprobarlo. -->
            <input
              id="name"
              formControlName="name"
              placeholder="Ej. Ana García"
              autocomplete="name"
              required
              [attr.maxlength]="nameMax"
              aria-describedby="name-feedback"
              [class.invalid]="invalid('name')"
              [class.warning]="!invalid('name') && nameWarnings().length > 0"
              [attr.aria-invalid]="invalid('name')"
            />
            <div id="name-feedback" aria-live="polite">
              @if (invalid('name')) {
                <p class="error"><app-icon name="alert" [size]="13" /> {{ nameError() }}</p>
              } @else if (nameWarnings().length > 0) {
                <div class="name-warning" role="status">
                  <app-icon name="info" [size]="14" />
                  <div>
                    @for (w of nameWarnings(); track w) {
                      <strong>{{ w }}</strong>
                    }
                    <span>Verifica que esté escrito correctamente antes de registrarlo.</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="form-group">
            <label for="email">Correo electrónico *</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              placeholder="ana.garcia@ejemplo.com"
              [class.invalid]="invalid('email')"
              [attr.aria-invalid]="invalid('email')"
            />
            @if (invalid('email')) {
              <p class="error" role="alert">
                <app-icon name="alert" [size]="13" />
                {{
                  form.controls.email.hasError('taken')
                    ? 'Ya existe un usuario con ese correo. Usa otro o busca al usuario en la lista.'
                    : 'Ingresa un correo válido.'
                }}
              </p>
            }
          </div>
        </div>
      </form>

      <div modal-actions>
        <button type="button" class="btn btn-secondary" (click)="cancel()" [disabled]="saving()">
          Cancelar
        </button>
        <button type="submit" form="member-form" class="btn btn-primary" [disabled]="saving()" [class.is-loading]="saving()" [attr.aria-busy]="saving()">
          <span class="btn-label">{{ editing() ? 'Guardar cambios' : 'Agregar usuario' }}</span>
          @if (saving()) {
            <span class="spinner-sm btn-spinner" aria-hidden="true"></span>
          }
        </button>
      </div>
    </app-modal>

    <!-- Confirmación cuando el nombre parece incorrecto (números o un solo carácter) -->
    <app-confirm-dialog
      [open]="nameConfirmOpen()"
      title="¿El nombre es correcto?"
      [message]="nameConfirmMessage()"
      confirmText="Sí, registrar"
      [loading]="saving()"
      (confirm)="confirmName()"
      (cancel)="reviewName()"
    />

    <!-- Eliminación: confirmación o, si tiene préstamos, aviso informativo sin petición -->
    <app-confirm-dialog
      [open]="deleteDialogOpen()"
      [title]="canDelete() ? 'Eliminar usuario' : 'No se puede eliminar'"
      [message]="deleteMessage()"
      [emphasis]="memberToDelete()?.name ?? ''"
      confirmText="Eliminar"
      [cancelText]="canDelete() ? 'Cancelar' : 'Entendido'"
      [showConfirm]="canDelete()"
      [variant]="canDelete() ? 'danger' : 'primary'"
      [loading]="deleting()"
      [error]="deleteError()"
      (confirm)="confirmDelete()"
      (cancel)="cancelDelete()"
    />
  `,
  styles: `
    /* ---- Validación del nombre ---- */
    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .char-count {
      font-size: 0.75rem;
      color: var(--muted);
      font-variant-numeric: tabular-nums;
    }
    .char-count.at-limit {
      color: var(--warn);
      font-weight: 700;
    }
    input.warning {
      border-color: var(--warn);
    }
    .name-warning {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.4rem;
      padding: 0.55rem 0.7rem;
      border: 1px solid var(--warning-border);
      border-radius: var(--radius-sm);
      background: var(--warning-light);
      color: var(--text);
      font-size: 0.8rem;
    }
    .name-warning app-icon {
      color: var(--warn);
      margin-top: 0.1rem;
    }
    .name-warning strong {
      display: block;
    }
    .name-warning span {
      color: var(--muted);
    }
    /* ---- Tabla de usuarios adaptable ---- */
    .members-table td {
      white-space: normal;
    }
    .members-table .col-actions {
      width: 1%;
      text-align: right;
    }
    .user-text {
      min-width: 0;
    }
    .user-email-inline {
      display: none;
      font-size: 0.8rem;
      color: var(--muted);
      overflow-wrap: anywhere;
    }
    @media (max-width: 720px) {
      .members-table .col-email {
        display: none;
      }
      .user-email-inline {
        display: block;
      }
      .members-table th,
      .members-table td {
        padding-left: 0.75rem;
        padding-right: 0.75rem;
      }
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      color: #ffffff;
      font-size: 0.8rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      text-transform: uppercase;
      box-shadow: var(--shadow-xs);
    }
    .user-avatar-lg {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      color: #ffffff;
      font-size: 1rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      text-transform: uppercase;
      flex-shrink: 0;
      box-shadow: var(--shadow-sm);
    }
    .user-name {
      color: var(--text);
      font-weight: 600;
    }
    .email-link {
      color: var(--muted);
      text-decoration: none;
      transition: color 0.15s;
    }
    .email-link:hover {
      color: var(--primary);
      text-decoration: underline;
    }
    .email-link-sm {
      font-size: 0.85rem;
      color: var(--muted);
      text-decoration: none;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .email-link-sm:hover {
      color: var(--primary);
    }
    .members-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.25rem;
    }
    .member-card {
      margin-bottom: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1rem;
      transition:
        transform 0.2s,
        box-shadow 0.2s;
    }
    .member-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    .member-card-header {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .member-card-details {
      flex: 1;
      min-width: 0;
    }
    .member-card-name {
      font-size: 1.05rem;
      font-weight: 700;
      margin: 0 0 0.15rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .member-card-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.4rem;
      border-top: 1px solid var(--border);
      padding-top: 0.75rem;
    }
  `,
})
export class MembersPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly members = signal<Member[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal<Member | null>(null);

  // Modales
  readonly isModalOpen = signal(false);
  readonly deleteDialogOpen = signal(false);
  readonly memberToDelete = signal<Member | null>(null);
  readonly deleting = signal(false);
  /** Motivo por el que el servidor rechazó la baja; se muestra dentro del diálogo. */
  readonly deleteError = signal<string | null>(null);

  /**
   * Solo se eliminan usuarios sin historial (regla del backend). Se sabe de antemano gracias a
   * los contadores del listado, así que no se hace una petición destinada a fallar.
   */
  readonly canDelete = computed(() => (this.memberToDelete()?.totalLoans ?? 0) === 0);

  readonly deleteMessage = computed(() => {
    const m = this.memberToDelete();
    if (!m) return '';
    if (this.canDelete()) {
      return `¿Seguro que deseas eliminar a ${m.name}? Esta acción no se puede deshacer.`;
    }
    const active = m.activeLoans ?? 0;
    const total = m.totalLoans ?? 0;
    const loans = (n: number) => `${n} ${n === 1 ? 'préstamo' : 'préstamos'}`;
    const situation =
      active > 0
        ? `tiene ${loans(active)} ${active === 1 ? 'activo' : 'activos'}` +
          (total > active ? ` y ${loans(total)} en su historial` : '')
        : `tiene ${loans(total)} en su historial`;
    return (
      `${m.name} ${situation}. Para conservar la trazabilidad, solo se pueden eliminar ` +
      'usuarios sin préstamos registrados.'
    );
  });

  // Búsqueda y Filtro
  readonly searchTerm = signal('');
  readonly viewMode = signal<'table' | 'grid'>('table');
  readonly sortField = signal<MemberSortField>('name');
  readonly sortOrder = signal<SortOrder>('asc');

  /** Opciones del menú de acciones de cada usuario (referencia estable para OnPush). */
  readonly memberActions: ActionMenuItem[] = [
    { id: 'edit', label: 'Editar', icon: 'edit' },
    { id: 'delete', label: 'Eliminar', icon: 'trash', danger: true },
  ];

  protected readonly nameMax = NAME_MAX;

  readonly form = this.fb.group({
    name: ['', [Validators.required, notBlank, Validators.maxLength(NAME_MAX)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
  });

  /** Valor del nombre como signal, para recalcular contador y avisos al escribir (OnPush). */
  private readonly nameValue = toSignal(this.form.controls.name.valueChanges, { initialValue: '' });
  protected readonly nameLength = computed(() => (this.nameValue() ?? '').length);
  protected readonly nameWarnings = computed(() => nameWarnings(this.nameValue()));
  /** Diálogo "¿El nombre es correcto?" previo a guardar cuando hay avisos. */
  readonly nameConfirmOpen = signal(false);
  protected readonly nameConfirmMessage = computed(
    () =>
      `Se va a registrar el nombre «${(this.nameValue() ?? '').trim()}». ` +
      `${this.nameWarnings().join(' ')} Confirma que es correcto o revísalo.`,
  );

  readonly filteredMembers = computed(() => {
    let result = [...this.members()];
    const query = this.searchTerm().trim().toLowerCase();
    const field = this.sortField();
    const order = this.sortOrder();

    if (query) {
      result = result.filter(
        (m) => m.name.toLowerCase().includes(query) || m.email.toLowerCase().includes(query),
      );
    }

    result.sort((a, b) => {
      const valA = a[field].toLowerCase();
      const valB = b[field].toLowerCase();
      const comp = valA.localeCompare(valB);
      return order === 'asc' ? comp : -comp;
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
    this.searchTerm.set(target?.value ?? '');
  }

  toggleSort(field: MemberSortField): void {
    if (this.sortField() === field) {
      this.sortOrder.update((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortField.set(field);
      this.sortOrder.set('asc');
    }
  }

  getSortIcon(field: MemberSortField): 'sort' | 'arrow-up' | 'arrow-down' {
    if (this.sortField() !== field) return 'sort';
    return this.sortOrder() === 'asc' ? 'arrow-up' : 'arrow-down';
  }

  load(): void {
    this.loading.set(true);
    this.api.listMembers().subscribe({
      next: (members) => {
        this.members.set(members);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: '', email: '' });
    this.isModalOpen.set(true);
    setTimeout(() => document.getElementById('name')?.focus(), 50);
  }

  save(): void {
    if (this.form.invalid) {
      this.isModalOpen.set(true);
      this.form.markAllAsTouched();
      return;
    }
    // Nombre sospechoso (números o un solo carácter): no se bloquea, pero se pide confirmación.
    if (this.nameWarnings().length > 0) {
      this.nameConfirmOpen.set(true);
      return;
    }
    this.persist();
  }

  /** El usuario confirmó que el nombre con avisos es correcto. */
  confirmName(): void {
    this.persist();
  }

  /** Volver al formulario para corregir el nombre. */
  reviewName(): void {
    this.nameConfirmOpen.set(false);
    setTimeout(() => document.getElementById('name')?.focus());
  }

  /** Mensaje del error de validación del nombre (prioridad: vacío > solo espacios > largo). */
  protected nameError(): string {
    const errors = this.form.controls.name.errors ?? {};
    if (errors['required'] || errors['blank']) return 'El nombre es obligatorio.';
    if (errors['maxlength']) return `El nombre no puede superar los ${NAME_MAX} caracteres.`;
    return 'El nombre no es válido.';
  }

  private persist(): void {
    const value = this.form.getRawValue();
    const current = this.editing();
    const request = current
      ? this.api.updateMember(current.id, value)
      : this.api.createMember(value);
    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.notify.ok(current ? 'Usuario actualizado' : 'Usuario agregado');
        this.nameConfirmOpen.set(false);
        this.cancel();
        this.saving.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.nameConfirmOpen.set(false);
        this.saving.set(false);
        if (err.status === 409 && /correo/i.test(messageFor(err))) {
          // Error en contexto: el campo se marca y recibe el foco. Al editarlo, los validadores
          // vuelven a ejecutarse y el error desaparece solo.
          const email = this.form.controls.email;
          email.setErrors({ ...(email.errors ?? {}), taken: true });
          email.markAsTouched();
          setTimeout(() => document.getElementById('email')?.focus());
        } else {
          this.notify.error(messageFor(err));
        }
      },
    });
  }

  edit(member: Member): void {
    this.editing.set(member);
    this.form.setValue({ name: member.name, email: member.email });
    this.isModalOpen.set(true);
    setTimeout(() => document.getElementById('name')?.focus(), 50);
  }

  cancel(): void {
    this.isModalOpen.set(false);
    this.editing.set(null);
    this.form.reset({ name: '', email: '' });
  }

  /** Despacha la opción elegida en el menú de acciones de un usuario. */
  onAction(action: string, member: Member): void {
    if (action === 'edit') {
      this.edit(member);
    } else if (action === 'delete') {
      this.remove(member);
    }
  }

  remove(member: Member): void {
    this.memberToDelete.set(member);
    this.deleteError.set(null);
    this.deleteDialogOpen.set(true);
  }

  confirmDelete(): void {
    const m = this.memberToDelete();
    if (!m || !this.canDelete()) return;

    this.deleting.set(true);
    this.deleteError.set(null);
    this.api.deleteMember(m.id).subscribe({
      next: () => {
        this.notify.ok('Usuario eliminado');
        this.deleteDialogOpen.set(false);
        this.memberToDelete.set(null);
        this.deleting.set(false);
        this.load();
      },
      // Caso raro (p. ej. alguien le prestó un libro mientras tanto): el motivo se ve en el diálogo.
      error: (err: HttpErrorResponse) => {
        this.deleting.set(false);
        this.deleteError.set(messageFor(err));
      },
    });
  }

  cancelDelete(): void {
    this.deleteDialogOpen.set(false);
    this.memberToDelete.set(null);
    this.deleteError.set(null);
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  getAvatarBg(name: string): string {
    const colors = [
      '#4f46e5',
      '#2563eb',
      '#0891b2',
      '#0d9488',
      '#059669',
      '#d97706',
      '#dc2626',
      '#7c3aed',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % colors.length;
    return colors[idx];
  }
}
