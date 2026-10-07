import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent, IconName } from './icon.component';

/** Opción de un {@link ComboboxComponent}. */
export interface ComboboxOption<T = number> {
  value: T;
  /** Texto principal; es lo que queda escrito en el campo al seleccionar. */
  label: string;
  /** Texto secundario (p. ej. el correo). También se usa para filtrar. */
  description?: string;
}

let nextId = 0;

/** Normaliza para comparar sin distinguir mayúsculas ni tildes ("Pérez" coincide con "perez"). */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Campo de selección con búsqueda (patrón WAI-ARIA "combobox" con lista).
 *
 * <ul>
 *   <li>Al hacer clic o enfocar el campo se despliegan <b>todas</b> las opciones.</li>
 *   <li>Al escribir se filtran por texto principal y secundario, sin importar tildes.</li>
 *   <li>Teclado: ↑/↓ para moverse, Enter para elegir, Escape para cerrar.</li>
 *   <li>Si se sale del campo sin elegir, vuelve a mostrar la opción seleccionada.</li>
 * </ul>
 *
 * <p>Implementa {@link ControlValueAccessor}, así que se usa como cualquier control de
 * formularios reactivos ({@code formControlName} / {@code [formControl]}).
 *
 * <p>La lista se monta en {@code <body>} con posición fija junto al campo, para que no la
 * recorte el {@code overflow} del cuerpo de una ventana modal.
 */
@Component({
  selector: 'app-combobox',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ComboboxComponent), multi: true },
  ],
  template: `
    <div class="combo-field" [class.open]="open()" [class.invalid]="invalid()">
      <app-icon name="search" [size]="15" class="combo-search-icon" />
      <input
        #input
        type="text"
        role="combobox"
        autocomplete="off"
        [id]="inputId()"
        [placeholder]="placeholder()"
        [value]="text()"
        [disabled]="disabled()"
        aria-autocomplete="list"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="listId"
        [attr.aria-activedescendant]="open() && activeIndex() >= 0 ? optionId(activeIndex()) : null"
        [attr.aria-invalid]="invalid()"
        (focus)="show()"
        (click)="show()"
        (input)="onInput($event)"
        (keydown)="onKeydown($event)"
        (blur)="onBlur()"
      />
      @if (text() && !disabled()) {
        <button
          type="button"
          class="combo-icon-btn"
          tabindex="-1"
          aria-label="Borrar selección"
          (mousedown)="$event.preventDefault()"
          (click)="clear()"
        >
          <app-icon name="close" [size]="14" />
        </button>
      }
      <button
        type="button"
        class="combo-icon-btn combo-chevron"
        tabindex="-1"
        [attr.aria-label]="open() ? 'Ocultar opciones' : 'Mostrar opciones'"
        [disabled]="disabled()"
        (mousedown)="$event.preventDefault()"
        (click)="toggleFromButton()"
      >
        <app-icon name="arrow-down" [size]="15" />
      </button>
    </div>

    @if (open()) {
      <ul
        #list
        class="combo-list"
        role="listbox"
        [id]="listId"
        [style.top.px]="pos().top"
        [style.bottom.px]="pos().bottom"
        [style.left.px]="pos().left"
        [style.width.px]="pos().width"
        [style.max-height.px]="pos().maxHeight"
        (mousedown)="$event.preventDefault()"
      >
        @for (opt of filtered(); track opt.value; let i = $index) {
          <li
            role="option"
            class="combo-option"
            [id]="optionId(i)"
            [class.active]="i === activeIndex()"
            [attr.aria-selected]="opt.value === value()"
            (mouseenter)="activeIndex.set(i)"
            (click)="select(opt)"
          >
            <span class="combo-avatar" aria-hidden="true">
              @if (icon(); as iconName) {
                <app-icon [name]="iconName" [size]="15" />
              } @else {
                {{ initials(opt.label) }}
              }
            </span>
            <span class="combo-text">
              <span class="combo-label">{{ opt.label }}</span>
              @if (opt.description) {
                <span class="combo-desc">{{ opt.description }}</span>
              }
            </span>
            @if (opt.value === value()) {
              <app-icon name="check" [size]="15" class="combo-check" />
            }
          </li>
        } @empty {
          <li class="combo-empty" role="presentation">{{ emptyText() }}</li>
        }
      </ul>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .combo-field {
      position: relative;
      display: flex;
      align-items: center;
    }
    .combo-field input {
      width: 100%;
      padding-left: 2.3rem;
      padding-right: 4.2rem;
    }
    .combo-field.invalid input {
      border-color: var(--danger);
    }
    .combo-search-icon {
      position: absolute;
      left: 0.8rem;
      color: var(--muted);
      pointer-events: none;
    }
    .combo-icon-btn {
      position: absolute;
      right: 0.45rem;
      width: 28px;
      height: 28px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--muted);
      cursor: pointer;
    }
    .combo-icon-btn:hover:not(:disabled) {
      background: var(--surface-subtle);
      color: var(--text);
    }
    .combo-icon-btn:not(.combo-chevron) {
      right: 2.15rem;
    }
    .combo-chevron app-icon {
      transition: transform 0.15s ease;
    }
    .combo-field.open .combo-chevron app-icon {
      transform: rotate(180deg);
    }
    .combo-list {
      position: fixed;
      z-index: 1001; /* por encima del fondo de la modal (999) */
      margin: 0;
      padding: 0.35rem;
      list-style: none;
      overflow-y: auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-xl);
    }
    .combo-option {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.55rem 0.65rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    .combo-option.active {
      background: var(--surface-subtle);
    }
    .combo-option[aria-selected='true'] .combo-label {
      color: var(--primary);
    }
    .combo-avatar {
      width: 30px;
      height: 30px;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: var(--primary-light);
      color: var(--primary);
      font-size: 0.72rem;
      font-weight: 700;
    }
    .combo-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }
    .combo-label {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--text);
    }
    .combo-desc {
      font-size: 0.78rem;
      color: var(--muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .combo-check {
      color: var(--primary);
    }
    .combo-empty {
      padding: 0.75rem;
      font-size: 0.85rem;
      color: var(--muted);
      text-align: center;
    }
  `,
})
export class ComboboxComponent<T = number> implements ControlValueAccessor {
  /** Opciones disponibles. */
  readonly options = input.required<ComboboxOption<T>[]>();
  readonly placeholder = input<string>('Escribe para buscar...');
  readonly emptyText = input<string>('Sin coincidencias');
  /** Icono a mostrar en cada opción; si no se indica, se muestran las iniciales del texto. */
  readonly icon = input<IconName | null>(null);
  /** Id del {@code <input>}, para asociarlo a un {@code <label for>}. */
  readonly inputId = input<string>(`combobox-${nextId++}`);
  /** Marca visual de error (el formulario decide cuándo mostrarla). */
  readonly invalid = input<boolean>(false);

  protected readonly listId = `combobox-list-${nextId++}`;
  protected readonly open = signal(false);
  protected readonly text = signal('');
  protected readonly value = signal<T | null>(null);
  protected readonly disabled = signal(false);
  protected readonly activeIndex = signal(-1);
  /** Mientras es {@code false} (recién abierto), se muestran todas las opciones. */
  private readonly filtering = signal(false);
  protected readonly pos = signal<{ top: number | null; bottom: number | null; left: number; width: number; maxHeight: number }>({
    top: 0,
    bottom: null,
    left: 0,
    width: 0,
    maxHeight: 280,
  });

  private readonly inputEl = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly listEl = viewChild<ElementRef<HTMLElement>>('list');

  private onChange: (value: T | null) => void = () => {};
  private onTouched: () => void = () => {};

  /** Opciones visibles: todas al abrir; filtradas en cuanto el usuario escribe. */
  protected readonly filtered = computed(() => {
    const options = this.options();
    const query = normalize(this.text());
    if (!this.filtering() || !query) return options;
    return options.filter((o) => normalize(`${o.label} ${o.description ?? ''}`).includes(query));
  });

  constructor() {
    // Portal manual de la lista a <body> (Angular la elimina con node.remove(), es seguro moverla).
    effect(() => {
      const list = this.listEl()?.nativeElement;
      if (list && list.parentElement !== document.body) {
        document.body.appendChild(list);
      }
    });

    // Si cambian las opciones (p. ej. llegan de la API) se vuelve a mostrar la etiqueta correcta.
    effect(() => {
      this.options();
      if (!this.open()) this.syncText();
    });

    // Recolocar al hacer scroll en cualquier contenedor (fase de captura) o al redimensionar.
    const reposition = () => this.open() && this.updatePosition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      this.listEl()?.nativeElement.remove();
    });
  }

  // ---- ControlValueAccessor ----------------------------------------------------------

  writeValue(value: T | null): void {
    this.value.set(value ?? null);
    this.syncText();
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  // ---- Interacción -------------------------------------------------------------------

  show(): void {
    if (this.open() || this.disabled()) return;
    this.filtering.set(false);
    this.updatePosition();
    this.open.set(true);
    const selected = this.options().findIndex((o) => o.value === this.value());
    this.activeIndex.set(selected >= 0 ? selected : 0);
    this.scrollActiveIntoView();
  }

  toggleFromButton(): void {
    if (this.open()) {
      this.hide();
    } else {
      this.inputEl().nativeElement.focus(); // el evento focus abre la lista
      this.show();
    }
  }

  onInput(event: Event): void {
    this.text.set((event.target as HTMLInputElement).value);
    this.filtering.set(true);
    this.activeIndex.set(0);
    if (!this.open()) {
      this.updatePosition();
      this.open.set(true);
    }
    // Si borra todo el texto, la selección deja de ser válida.
    if (!this.text().trim() && this.value() !== null) {
      this.commit(null);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    const count = this.filtered().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open()) return this.show();
        this.activeIndex.set(count ? (this.activeIndex() + 1) % count : -1);
        this.scrollActiveIntoView();
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.open()) return this.show();
        this.activeIndex.set(count ? (this.activeIndex() - 1 + count) % count : -1);
        this.scrollActiveIntoView();
        break;
      case 'Enter': {
        const option = this.filtered()[this.activeIndex()];
        if (this.open() && option) {
          event.preventDefault(); // no enviar el formulario al elegir con Enter
          this.select(option);
        }
        break;
      }
      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          event.stopPropagation(); // cierra la lista, no la ventana modal
          this.hide();
        }
        break;
      case 'Tab':
        this.hide();
        break;
    }
  }

  onBlur(): void {
    this.hide();
    this.onTouched();
  }

  select(option: ComboboxOption<T>): void {
    this.commit(option.value);
    this.hide();
  }

  clear(): void {
    this.commit(null);
    this.text.set('');
    this.filtering.set(false);
    this.inputEl().nativeElement.focus();
  }

  protected optionId(index: number): string {
    return `${this.listId}-opt-${index}`;
  }

  protected initials(label: string): string {
    return label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  // ---- Internos ----------------------------------------------------------------------

  private hide(): void {
    this.open.set(false);
    this.filtering.set(false);
    this.syncText(); // descarta texto a medias y muestra la opción seleccionada
  }

  private commit(value: T | null): void {
    if (value === this.value()) return;
    this.value.set(value);
    this.onChange(value);
  }

  /** Muestra en el campo la etiqueta de la opción seleccionada (o vacío). */
  private syncText(): void {
    const selected = this.options().find((o) => o.value === this.value());
    this.text.set(selected?.label ?? '');
  }

  /** Coloca la lista bajo el campo; si no cabe, encima. */
  private updatePosition(): void {
    const rect = this.inputEl().nativeElement.getBoundingClientRect();
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    const spaceAbove = rect.top - gap - 8;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(280, openUp ? spaceAbove : spaceBelow);
    this.pos.set({
      left: rect.left,
      width: rect.width,
      maxHeight,
      // Hacia arriba se ancla por abajo, para quedar pegada al campo aunque haya pocas opciones.
      top: openUp ? null : rect.bottom + gap,
      bottom: openUp ? window.innerHeight - rect.top + gap : null,
    });
  }

  private scrollActiveIntoView(): void {
    setTimeout(() => {
      document.getElementById(this.optionId(this.activeIndex()))?.scrollIntoView({ block: 'nearest' });
    });
  }
}
