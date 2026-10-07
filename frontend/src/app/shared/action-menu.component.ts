import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { IconComponent, IconName } from './icon.component';

/** Opción de un {@link ActionMenuComponent}. */
export interface ActionMenuItem {
  /** Identificador que se emite al seleccionar la opción. */
  id: string;
  /** Texto de la opción, p. ej. «Editar». */
  label: string;
  icon?: IconName;
  /** Acciones destructivas (eliminar) se muestran en rojo y separadas del resto. */
  danger?: boolean;
  disabled?: boolean;
}

/** Separación en píxeles entre el botón ⋮ y el panel. */
const GAP = 6;

/**
 * Menú contextual de "tres puntos" (kebab) para las acciones de una fila o tarjeta.
 *
 * <p>El panel se traslada a {@code <body>} mientras está abierto y se posiciona con
 * {@code position: fixed} junto al botón. Así no lo recortan los contenedores con
 * {@code overflow} (como las tablas), no genera scroll y no le afectan los {@code transform}
 * de sus ancestros (p. ej. el efecto hover de las tarjetas). Si no cabe debajo, se abre hacia arriba.
 *
 * <p>Accesibilidad: patrón WAI-ARIA "menu button". Se navega con flechas, Inicio/Fin,
 * se cierra con Escape o Tab, y el foco vuelve al botón al cerrar.
 */
@Component({
  selector: 'app-action-menu',
  imports: [IconComponent],
  // OnPush: Angular solo vuelve a pintar este componente cuando cambian sus entradas o sus signals.
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      #trigger
      type="button"
      class="kebab-btn"
      [class.open]="open()"
      aria-haspopup="menu"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="label()"
      [title]="label()"
      (click)="toggle()"
      (keydown.arrowDown)="openAndFocus(0, $event)"
      (keydown.arrowUp)="openAndFocus(-1, $event)"
    >
      <app-icon name="more-vertical" [size]="18" />
    </button>

    @if (open()) {
      <div
        #panel
        class="menu-panel"
        role="menu"
        [attr.aria-label]="label()"
        [style.top.px]="top()"
        [style.right.px]="right()"
        (keydown)="onMenuKeydown($event)"
      >
        @for (item of items(); track item.id) {
          @if (item.danger && !$first) {
            <div class="menu-sep" role="separator"></div>
          }
          <button
            #menuItem
            type="button"
            role="menuitem"
            class="menu-item"
            [class.danger]="item.danger"
            [disabled]="item.disabled"
            tabindex="-1"
            (click)="choose(item)"
          >
            @if (item.icon) {
              <app-icon [name]="item.icon" [size]="15" />
            }
            <span>{{ item.label }}</span>
          </button>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .kebab-btn {
      width: 34px;
      height: 34px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--muted);
      cursor: pointer;
      transition:
        background-color 0.15s ease,
        color 0.15s ease,
        border-color 0.15s ease;
    }
    /* En pantallas táctiles el botón mide 44 px (tamaño cómodo para el dedo). */
    @media (pointer: coarse) {
      .kebab-btn {
        width: 44px;
        height: 44px;
      }
    }
    .kebab-btn:hover,
    .kebab-btn.open {
      background: var(--surface-subtle);
      border-color: var(--border);
      color: var(--text);
    }
    .menu-panel {
      position: fixed;
      z-index: 900;
      width: max-content; /* crece con etiquetas largas */
      min-width: 190px;
      max-width: calc(100vw - 16px);
      padding: 0.35rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-xl);
      animation: menuIn 0.12s ease-out;
    }
    .menu-item {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: flex-start; /* el estilo global de button centra el contenido */
      gap: 0.6rem;
      padding: 0.55rem 0.7rem;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text);
      font: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
    }
    .menu-item:hover:not(:disabled),
    .menu-item:focus-visible {
      background: var(--surface-subtle);
      outline: none;
    }
    .menu-item:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .menu-item.danger {
      color: var(--danger);
    }
    .menu-item.danger:hover:not(:disabled),
    .menu-item.danger:focus-visible {
      background: var(--danger-light);
    }
    .menu-sep {
      height: 1px;
      margin: 0.3rem 0.2rem;
      background: var(--border);
    }
    @keyframes menuIn {
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
export class ActionMenuComponent {
  /** Opciones del menú, en orden de aparición. */
  readonly items = input.required<ActionMenuItem[]>();
  /** Nombre accesible del botón, p. ej. "Acciones para Dune". */
  readonly label = input<string>('Más acciones');
  /** Emite el {@code id} de la opción elegida. */
  readonly selected = output<string>();

  /** Si el panel está abierto. */
  protected readonly open = signal(false);
  /** Posición del panel en pantalla (fixed), calculada junto al botón al abrir. */
  protected readonly top = signal(0);
  protected readonly right = signal(0);

  /** Elemento del propio componente, para detectar clics fuera del menú. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** Botón ⋮ (para colocar el panel y devolverle el foco al cerrar). */
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  /** Botones de las opciones (para moverse con las flechas). */
  private readonly menuItems = viewChildren<ElementRef<HTMLButtonElement>>('menuItem');
  /** Panel desplegable. */
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  constructor() {
    // Portal manual: Angular elimina el nodo con node.remove(), así que moverlo es seguro.
    effect(() => {
      const panel = this.panel()?.nativeElement;
      if (panel && panel.parentElement !== document.body) {
        document.body.appendChild(panel);
      }
    });
    // Si la fila se destruye con el menú abierto (p. ej. tras eliminar), no dejar el panel huérfano.
    inject(DestroyRef).onDestroy(() => this.panel()?.nativeElement.remove());
  }

  /** Clic en ⋮: abre el panel o lo cierra si ya estaba abierto. */
  toggle(): void {
    if (this.open()) {
      this.close(false);
    } else {
      this.show();
    }
  }

  /** Abre con el teclado y enfoca la primera (0) o la última (-1) opción. */
  openAndFocus(index: number, event: Event): void {
    event.preventDefault();
    this.show();
    setTimeout(() => this.focusItem(index));
  }

  /** Opción elegida: avisa al padre con su id y cierra el panel devolviendo el foco al botón. */
  choose(item: ActionMenuItem): void {
    if (item.disabled) return;
    this.close(true);
    this.selected.emit(item.id);
  }

  /** Teclado dentro del panel: flechas para moverse, Inicio/Fin, Escape para cerrar y Tab para salir. */
  onMenuKeydown(event: KeyboardEvent): void {
    const items = this.enabledItems();
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        items[(current + 1) % items.length]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        items[(current - 1 + items.length) % items.length]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case 'Escape':
        event.preventDefault();
        this.close(true);
        break;
      case 'Tab':
        this.close(false);
        break;
    }
  }

  /** Cierra al hacer clic fuera del componente. */
  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    const target = event.target as Node;
    const insidePanel = this.panel()?.nativeElement.contains(target) ?? false;
    if (this.open() && !insidePanel && !this.host.nativeElement.contains(target)) {
      this.close(false);
    }
  }

  /**
   * El panel es fijo respecto a la ventana: al hacer scroll o redimensionar se recoloca junto
   * al botón, y se cierra si el botón deja de estar visible.
   */
  @HostListener('window:resize')
  @HostListener('window:scroll')
  onViewportChange(): void {
    if (!this.open()) return;
    const rect = this.trigger().nativeElement.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      this.close(false);
    } else {
      this.position(rect);
    }
  }

  /** Abre el panel colocado junto al botón. */
  private show(): void {
    this.position(this.trigger().nativeElement.getBoundingClientRect());
    this.open.set(true);
  }

  /**
   * Coloca el panel debajo del botón, alineado a su borde derecho; si no cabe abajo, lo abre
   * hacia arriba.
   */
  private position(rect: DOMRect): void {
    const estimatedHeight = this.items().length * 40 + 16;
    const fitsBelow = rect.bottom + GAP + estimatedHeight <= window.innerHeight;

    // Alineado al borde derecho del botón (el panel crece hacia la izquierda según su contenido).
    this.right.set(Math.max(8, document.documentElement.clientWidth - rect.right));
    this.top.set(fitsBelow ? rect.bottom + GAP : Math.max(8, rect.top - GAP - estimatedHeight));
  }

  /** Cierra el panel; si se cerró con teclado, devuelve el foco al botón ⋮. */
  private close(restoreFocus: boolean): void {
    this.open.set(false);
    if (restoreFocus) {
      this.trigger().nativeElement.focus();
    }
  }

  /** Opciones que se pueden elegir (omite las desactivadas). */
  private enabledItems(): HTMLButtonElement[] {
    return this.menuItems()
      .map((ref) => ref.nativeElement)
      .filter((el) => !el.disabled);
  }

  /** Pone el foco en la opción indicada (-1 = la última). */
  private focusItem(index: number): void {
    const items = this.enabledItems();
    items.at(index)?.focus();
  }
}

