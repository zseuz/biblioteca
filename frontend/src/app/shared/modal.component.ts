import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { IconComponent } from './icon.component';

/**
 * Ventana modal reutilizable (formularios y diálogos). Pinta el fondo oscuro, la cabecera con
 * título y botón ×, el cuerpo con el contenido proyectado (<ng-content>) y un pie para los
 * botones (los que lleven el atributo modal-actions). Se cierra con ×, con Escape o al hacer clic
 * fuera, y en todos los casos emite {@code close}: quien la usa decide qué hacer.
 */
@Component({
  selector: 'app-modal',
  imports: [IconComponent],
  // OnPush: Angular solo vuelve a pintar este componente cuando cambian sus entradas o sus signals.
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="modal-backdrop" (click)="onBackdropClick($event)" role="presentation">
        <div
          #dialogEl
          class="modal-dialog"
          [class.modal-lg]="size() === 'lg'"
          [class.modal-sm]="size() === 'sm'"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
          tabindex="-1"
        >
          <div class="modal-header">
            <div>
              <h2 [id]="titleId" class="modal-title">{{ title() }}</h2>
              @if (subtitle()) {
                <p class="modal-subtitle">{{ subtitle() }}</p>
              }
            </div>
            <button
              type="button"
              class="modal-close-btn"
              (click)="close.emit()"
              aria-label="Cerrar ventana"
            >
              <app-icon name="close" [size]="18" />
            </button>
          </div>

          <div class="modal-body">
            <ng-content />
          </div>

          @if (hasFooter()) {
            <div class="modal-footer">
              <ng-content select="[modal-actions]" />
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
      padding: 1rem;
      animation: fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .modal-dialog {
      background: var(--surface);
      color: var(--text);
      border-radius: var(--radius-xl);
      border: 1px solid var(--border);
      box-shadow:
        0 25px 50px -12px rgba(0, 0, 0, 0.25),
        0 0 0 1px rgba(0, 0, 0, 0.05);
      width: 100%;
      max-width: 520px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      outline: none;
      overflow: hidden;
      animation: slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .modal-dialog.modal-lg {
      max-width: 680px;
    }

    .modal-dialog.modal-sm {
      max-width: 400px;
    }

    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
    }

    .modal-title {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--text);
    }

    .modal-subtitle {
      margin: 0.25rem 0 0;
      font-size: 0.85rem;
      color: var(--muted);
    }

    .modal-close-btn {
      background: transparent;
      border: 0;
      color: var(--muted);
      border-radius: var(--radius-sm);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.35rem;
      transition:
        background 0.15s,
        color 0.15s;
    }

    .modal-close-btn:hover {
      background: var(--hover);
      color: var(--text);
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      /* Sin esto el eje X también es "auto" y aparecen barras aunque el contenido quepa. */
      overflow-x: hidden;
      flex: 1;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      background: var(--surface-subtle);
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(12px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `,
})
export class ModalComponent {
  /** Si la ventana está abierta. La controla el componente padre. */
  readonly open = input<boolean>(false);
  /** Título de la cabecera (también es el nombre accesible del diálogo). */
  readonly title = input.required<string>();
  /** Texto opcional bajo el título. */
  readonly subtitle = input<string>('');
  /** Ancho máximo: pequeño (confirmaciones), mediano o grande (formularios). */
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** Muestra el pie para los botones de acción. */
  readonly hasFooter = input<boolean>(true);
  /** Se emite al pedir cerrar (×, Escape o clic fuera). */
  readonly close = output<void>();

  /** Id estable del título: debe ser el mismo en el h2 y en aria-labelledby del diálogo. */
  readonly titleId = `modal-title-${Math.random().toString(36).slice(2, 7)}`;
  /** Referencia al cuadro del diálogo, para darle el foco al abrir. */
  readonly dialogEl = viewChild<ElementRef<HTMLElement>>('dialogEl');

  /**
   * Modales abiertas en orden de apertura. Escape solo cierra la de arriba: si hay una
   * confirmación sobre un formulario, el formulario (y lo escrito) se conserva.
   */
  private static readonly openStack: ModalComponent[] = [];

  constructor() {
    effect(() => {
      const index = ModalComponent.openStack.indexOf(this);
      if (this.open() && index === -1) {
        ModalComponent.openStack.push(this);
      } else if (!this.open() && index !== -1) {
        ModalComponent.openStack.splice(index, 1);
      }
    });
    inject(DestroyRef).onDestroy(() => {
      const index = ModalComponent.openStack.indexOf(this);
      if (index !== -1) ModalComponent.openStack.splice(index, 1);
    });
  }

  /** Escape cierra solo la modal de arriba (la última abierta), nunca las de debajo. */
  @HostListener('window:keydown.escape')
  onEscape(): void {
    const stack = ModalComponent.openStack;
    if (this.open() && stack[stack.length - 1] === this) {
      this.close.emit();
    }
  }

  /** Clic en el fondo oscuro: cierra. Un clic dentro del cuadro no llega aquí como «fondo». */
  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
