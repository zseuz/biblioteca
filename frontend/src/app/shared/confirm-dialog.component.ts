import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
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
  // OnPush: Angular solo vuelve a pintar este componente cuando cambian sus entradas o sus signals.
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="open()" [title]="title()" [subtitle]="''" size="sm" (close)="cancel.emit()">
      <div class="confirm-content">
        <div class="confirm-icon-wrap" [class.danger]="variant() === 'danger'">
          <app-icon [name]="variant() === 'danger' ? 'alert' : 'info'" [size]="28" />
        </div>
        <!-- Texto plano + <strong>: el nombre nunca se interpreta como HTML -->
        <p class="confirm-message">{{ parts().before }}@if (parts().strong) {<strong>{{ parts().strong }}</strong>}{{ parts().after }}</p>
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

    .confirm-message strong {
      color: var(--text);
      font-weight: 700;
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
  /** Si el diálogo está visible. */
  readonly open = input<boolean>(false);
  /** Título, p. ej. «Eliminar libro». */
  readonly title = input.required<string>();
  /** Pregunta o explicación que se muestra en el centro. */
  readonly message = input.required<string>();
  /**
   * Fragmento del mensaje que se muestra en negrita (p. ej. el nombre del libro o del usuario).
   * Se resalta su primera aparición dentro de {@link message}.
   */
  readonly emphasis = input<string>('');
  /** Texto del botón de confirmar, p. ej. «Eliminar». */
  readonly confirmText = input<string>('Confirmar');
  /** Texto del botón de cancelar («Entendido» en los avisos informativos). */
  readonly cancelText = input<string>('Cancelar');
  /** {@code false} = diálogo solo informativo (un único botón, {@code cancelText}). */
  readonly showConfirm = input<boolean>(true);
  /** Color: rojo para acciones destructivas, azul para el resto. */
  readonly variant = input<'danger' | 'primary'>('danger');
  /** Mientras es true, el botón muestra un spinner y no se puede pulsar de nuevo. */
  readonly loading = input<boolean>(false);
  /** Motivo por el que falló la acción; se muestra dentro del diálogo. */
  readonly error = input<string | null>(null);

  /** Divide el mensaje para pintar en negrita el fragmento indicado. */
  protected readonly parts = computed(() => {
    const message = this.message();
    const strong = this.emphasis();
    const index = strong ? message.indexOf(strong) : -1;
    if (index < 0) return { before: message, strong: '', after: '' };
    return {
      before: message.slice(0, index),
      strong,
      after: message.slice(index + strong.length),
    };
  });

  /** El usuario confirmó la acción. */
  readonly confirm = output<void>();
  /** El usuario canceló o cerró el diálogo. */
  readonly cancel = output<void>();
}
