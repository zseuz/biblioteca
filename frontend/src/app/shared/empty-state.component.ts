import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent, IconName } from './icon.component';

/**
 * Mensaje para cuando no hay nada que mostrar: lista vacía, búsqueda sin resultados o error
 * de conexión. Muestra un icono, un título, una explicación y, opcionalmente, un botón de acción
 * («Agregar libro», «Limpiar filtros», «Reintentar»).
 */
@Component({
  selector: 'app-empty-state',
  imports: [IconComponent],
  // OnPush: Angular solo vuelve a pintar este componente cuando cambian sus entradas o sus signals.
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state-box">
      <div class="empty-icon-wrap">
        <app-icon [name]="icon()" [size]="36" />
      </div>
      <h3 class="empty-title">{{ title() }}</h3>
      @if (message()) {
        <p class="empty-message">{{ message() }}</p>
      }
      @if (actionLabel()) {
        <button type="button" class="btn btn-primary btn-sm mt-3" (click)="action.emit()">
          <app-icon name="plus" [size]="15" />
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  styles: `
    .empty-state-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 3.5rem 1.5rem;
      color: var(--muted);
      border-radius: var(--radius-lg);
      background: var(--surface-subtle);
      border: 1px dashed var(--border);
      margin: 1rem 0;
    }

    .empty-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--muted);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
    }

    .empty-title {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--text);
      margin: 0 0 0.35rem;
    }

    .empty-message {
      font-size: 0.88rem;
      color: var(--muted);
      max-width: 380px;
      margin: 0;
      line-height: 1.45;
    }

    .mt-3 {
      margin-top: 1rem;
    }
  `,
})
export class EmptyStateComponent {
  /** Icono grande de la parte superior. */
  readonly icon = input<IconName>('book-open');
  /** Título, p. ej. «No hay libros registrados». */
  readonly title = input.required<string>();
  /** Explicación debajo del título. */
  readonly message = input<string>('');
  /** Texto del botón; si está vacío no se muestra botón. */
  readonly actionLabel = input<string>('');
  /** Se emite al pulsar el botón. */
  readonly action = output<void>();
}
