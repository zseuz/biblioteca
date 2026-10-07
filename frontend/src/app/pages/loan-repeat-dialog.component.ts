import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Loan } from '../core/models';
import { daysBetween, formatIsoDate, renewableOn } from '../core/renewal';
import { IconComponent } from '../shared/icon.component';
import { ModalComponent } from '../shared/modal.component';

/** Préstamo repetido detectado: el usuario ya tiene sin devolver el libro que vuelve a pedir. */
export interface LoanRepeat {
  memberName: string;
  bookTitle: string;
  /** Préstamos sin devolver de ese usuario para ese libro (normalmente uno). */
  existing: Loan[];
}

/**
 * Aviso que aparece antes de registrar un préstamo si el usuario ya tiene ese mismo libro sin
 * devolver. Indica desde cuándo lo tiene y ofrece:
 *
 * <ul>
 *   <li><b>Prestar otro ejemplar</b> (confirmar el préstamo de todas formas).</li>
 *   <li><b>Renovar existente</b>: vuelve a tener 14 días contando desde hoy. Solo se puede cuando
 *       faltan pocos días para el vencimiento; antes, el botón queda desactivado y se indica
 *       desde qué fecha se podrá.</li>
 *   <li><b>Cancelar</b>.</li>
 * </ul>
 *
 * <p>Si el préstamo existente está vencido no se ofrece ninguna de las dos acciones: el usuario
 * debe devolverlo antes (un vencido no se renueva y bloquea nuevos préstamos).
 */
@Component({
  selector: 'app-loan-repeat-dialog',
  imports: [ModalComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (repeat(); as r) {
      <app-modal
        [open]="true"
        title="Este usuario ya tiene el libro"
        subtitle="Revisa el préstamo que ya existe antes de continuar"
        size="md"
        (close)="cancel.emit()"
      >
        <p class="repeat-text">
          <strong>{{ r.memberName }}</strong> ya tiene prestado <strong>{{ r.bookTitle }}</strong>
          {{ r.existing.length === 1 ? 'desde el' : 'en estos préstamos:' }}
          @if (r.existing.length === 1) {
            <strong>{{ date(r.existing[0].loanDate) }}</strong>.
          }
        </p>

        <ul class="repeat-list">
          @for (loan of r.existing; track loan.id) {
            <li [class.overdue]="loan.status === 'OVERDUE'">
              <app-icon [name]="loan.status === 'OVERDUE' ? 'alert' : 'calendar'" [size]="16" />
              <span>
                Prestado el {{ date(loan.loanDate) }} ·
                {{ loan.status === 'OVERDUE' ? 'venció' : 'vence' }} el <strong>{{ date(loan.dueDate) }}</strong>
                @if (loan.renewals) {
                  · renovado {{ loan.renewals === 1 ? '1 vez' : loan.renewals + ' veces' }}
                }
              </span>
              <span class="badge" [class.ok]="loan.status === 'ACTIVE'" [class.bad]="loan.status === 'OVERDUE'">
                {{ loan.status === 'OVERDUE' ? 'Vencido' : 'En plazo' }}
              </span>
            </li>
          }
        </ul>

        @if (hasOverdue()) {
          <p class="repeat-note">
            <app-icon name="alert" [size]="15" />
            El préstamo está vencido: el usuario debe devolverlo antes de pedir otro libro, y un
            préstamo vencido no se puede renovar.
          </p>
        } @else if (renewFrom(); as from) {
          <p class="repeat-text">¿Quieres registrar <strong>otro préstamo</strong> del mismo libro?</p>
          <p class="repeat-note info">
            <app-icon name="info" [size]="15" />
            <span>
              Todavía no se puede renovar el préstamo actual: podrá renovarse desde el
              <strong>{{ date(from) }}</strong>, cuando falten {{ windowDays() }}
              {{ windowDays() === 1 ? 'día' : 'días' }} o menos para su vencimiento.
            </span>
          </p>
        } @else {
          <p class="repeat-text">
            ¿Quieres registrar <strong>otro préstamo</strong> del mismo libro, o
            <strong>renovar</strong> el que ya tiene para que vuelva a tener 14 días contando desde hoy?
          </p>
        }

        <div modal-actions class="repeat-actions">
          <button type="button" class="btn btn-secondary" (click)="cancel.emit()" [disabled]="busy()">
            {{ hasOverdue() ? 'Entendido' : 'Cancelar' }}
          </button>
          @if (!hasOverdue()) {
            <button
              type="button"
              class="btn btn-secondary"
              [disabled]="busy() || !!renewFrom()"
              [attr.title]="renewFrom() ? 'Podrá renovarse desde el ' + date(renewFrom()!) : null"
              (click)="renew.emit(renewTarget()!)"
            >
              <app-icon name="refresh" [size]="15" />
              Renovar existente
            </button>
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="busy()"
              [class.is-loading]="busy()"
              [attr.aria-busy]="busy()"
              (click)="lendAnyway.emit()"
            >
              <span class="btn-label">Prestar otro ejemplar</span>
              @if (busy()) {
                <span class="spinner-sm btn-spinner" aria-hidden="true"></span>
              }
            </button>
          }
        </div>
      </app-modal>
    }
  `,
  styles: `
    .repeat-text {
      margin: 0 0 0.85rem;
      font-size: 0.9rem;
      line-height: 1.55;
      color: var(--text);
    }
    .repeat-list {
      list-style: none;
      margin: 0 0 0.85rem;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .repeat-list li {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-subtle);
      font-size: 0.85rem;
      color: var(--muted);
    }
    .repeat-list li > span:first-of-type {
      flex: 1;
    }
    .repeat-list li strong {
      color: var(--text);
    }
    .repeat-list li.overdue {
      border-color: var(--danger-border);
      background: var(--danger-light);
    }
    .repeat-list li.overdue app-icon {
      color: var(--danger);
    }
    .repeat-note {
      display: flex;
      gap: 0.5rem;
      margin: 0;
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--warning-border);
      border-radius: var(--radius-sm);
      background: var(--warning-light);
      font-size: 0.85rem;
      color: var(--text);
    }
    .repeat-note.info {
      border-color: var(--border);
      background: var(--surface-subtle);
    }
    .repeat-note.info app-icon {
      color: var(--primary);
    }
    .repeat-note app-icon {
      color: var(--warn);
      flex-shrink: 0;
      margin-top: 0.1rem;
    }
    .repeat-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.5rem;
    }
  `,
})
export class LoanRepeatDialogComponent {
  /** Préstamo repetido detectado; {@code null} oculta el aviso. */
  readonly repeat = input<LoanRepeat | null>(null);
  readonly busy = input<boolean>(false);

  /** Confirmar: registrar otro préstamo del mismo libro. */
  readonly lendAnyway = output<void>();
  /** Renovar el préstamo existente (el que vence antes). */
  readonly renew = output<Loan>();
  readonly cancel = output<void>();

  protected readonly hasOverdue = computed(
    () => this.repeat()?.existing.some((l) => l.status === 'OVERDUE') ?? false,
  );

  /** Si hubiera varios, se renueva el que vence antes. */
  protected readonly renewTarget = computed(() =>
    [...(this.repeat()?.existing ?? [])].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null,
  );

  /** Si todavía no es el momento de renovar el préstamo existente: desde qué día se podrá. */
  protected readonly renewFrom = computed(() => {
    const target = this.renewTarget();
    return target ? renewableOn(target) : null;
  });

  /** Días antes del vencimiento a partir de los cuales se permite renovar (lo define el servidor). */
  protected readonly windowDays = computed(() => {
    const target = this.renewTarget();
    return target?.renewableFrom ? daysBetween(target.renewableFrom, target.dueDate) : 0;
  });

  protected date(iso: string): string {
    return formatIsoDate(iso);
  }
}
