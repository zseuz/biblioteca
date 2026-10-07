import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from './icon.component';
import { ModalComponent } from './modal.component';

/**
 * Diálogo de confirmación.
 *
 * <ul>
 *   <li><b>Carga sin saltos:</b> el botón conserva su ancho (el texto se oculta y el spinner se
 *       superpone) y el spinner solo aparece si la espera supera ~150 ms, así una respuesta
 *       rápida del servidor no produce un parpadeo.</li>
 *   <li><b>Errores en contexto:</b> si la acción falla, el motivo se muestra dentro del propio
 *       diálogo en lugar de un aviso detrás de la ventana.</li>
 *   <li><b>Modo informativo:</b> con {@code showConfirm=false} solo queda un botón
 *       ({@code cancelText}, p. ej. "Entendido") para explicar por qué algo no se puede hacer.</li>
 * </ul>
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [ModalComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="open()" [title]="title()" [subtitle]="''" size="sm" (close)="cancel.emit()">
      <div class="confirm-content">
        <div class="confirm-icon-wrap" [class.danger]="variant() === 'danger'">
          <app-icon [name]="variant() === 'danger' ? 'alert' : 'info'" [size]="28" />
        </div>
        <p class="confirm-message">{{ message() }}</p>
        @if (error()) {
          <p class="confirm-error" role="alert">
            <app-icon name="alert" [size]="15" />
            <span>{{ error() }}</span>
          </p>
        }
      </div>

      <div modal-actions class="confirm-actions">
        <button
          type="button"
          class="btn btn-secondary"
          [disabled]="loading()"
          (click)="cancel.emit()"
        >
          {{ cancelText() }}
        </button>
        @if (showConfirm()) {
          <button
            type="button"
            class="btn"
            [class.btn-danger]="variant() === 'danger'"
            [class.btn-primary]="variant() !== 'danger'"
            [class.is-loading]="loading()"
            [disabled]="loading()"
            [attr.aria-busy]="loading()"
            (click)="confirm.emit()"
          >
            <span class="btn-label">{{ confirmText() }}</span>
            @if (loading()) {
              <span class="spinner-sm btn-spinner" aria-hidden="true"></span>
            }
          </button>
        }
      </div>
    </app-modal>
  `,
  styles: `
    .confirm-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 0.5rem 0 1rem;
      gap: 1rem;
    }

    .confirm-icon-wrap {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--primary-light);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .confirm-icon-wrap.danger {
      background: var(--danger-light);
      color: var(--danger);
    }

    .confirm-message {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .confirm-error {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      width: 100%;
      margin: 0;
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--danger-border);
      border-radius: var(--radius-sm);
      background: var(--danger-light);
      color: var(--danger);
      font-size: 0.85rem;
      text-align: left;
      animation: errorIn 0.2s ease-out;
    }

    .confirm-actions {
      display: flex;
      width: 100%;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    @keyframes errorIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
})
export class ConfirmDialogComponent {
  readonly open = input<boolean>(false);
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmText = input<string>('Confirmar');
  readonly cancelText = input<string>('Cancelar');
  /** {@code false} = diálogo solo informativo (un único botón, {@code cancelText}). */
  readonly showConfirm = input<boolean>(true);
  readonly variant = input<'danger' | 'primary'>('danger');
  readonly loading = input<boolean>(false);
  /** Motivo por el que falló la acción; se muestra dentro del diálogo. */
  readonly error = input<string | null>(null);

  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
