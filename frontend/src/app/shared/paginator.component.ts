import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

/** Elemento de la lista de páginas: un número o un hueco ("…"). */
type PageItem = { kind: 'page'; index: number } | { kind: 'gap'; key: string };

/**
 * Paginador reutilizable.
 *
 * <ul>
 *   <li>Resumen "Mostrando 11–20 de 57".</li>
 *   <li>Anterior / siguiente y números de página; con muchas páginas muestra la primera, la
 *       última y las cercanas a la actual, con "…" en medio.</li>
 *   <li>Selector de elementos por página.</li>
 *   <li>Accesible: {@code <nav>} con etiqueta y {@code aria-current="page"} en la actual.</li>
 * </ul>
 *
 * <p>Las páginas empiezan en 0 (igual que la API); en pantalla se muestran desde 1.
 */
@Component({
  selector: 'app-paginator',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="paginator" [attr.aria-label]="label()">
      <p class="summary" aria-live="polite">
        @if (totalElements() === 0) {
          Sin resultados
        } @else {
          Mostrando <strong>{{ from() }}–{{ to() }}</strong> de <strong>{{ totalElements() }}</strong>
        }
      </p>

      <div class="controls">
        <button
          type="button"
          class="nav-btn"
          [disabled]="page() === 0 || disabled()"
          (click)="go(page() - 1)"
          aria-label="Página anterior"
        >
          <app-icon name="arrow-down" [size]="15" class="prev-icon" />
        </button>

        <ul class="pages">
          @for (item of items(); track item.kind === 'page' ? item.index : item.key) {
            @if (item.kind === 'page') {
              <li>
                <button
                  type="button"
                  class="page-btn"
                  [class.current]="item.index === page()"
                  [attr.aria-current]="item.index === page() ? 'page' : null"
                  [attr.aria-label]="'Página ' + (item.index + 1)"
                  [disabled]="disabled()"
                  (click)="go(item.index)"
                >
                  {{ item.index + 1 }}
                </button>
              </li>
            } @else {
              <li class="gap" aria-hidden="true">…</li>
            }
          }
        </ul>

        <button
          type="button"
          class="nav-btn"
          [disabled]="page() >= totalPages() - 1 || disabled()"
          (click)="go(page() + 1)"
          aria-label="Página siguiente"
        >
          <app-icon name="arrow-down" [size]="15" class="next-icon" />
        </button>
      </div>

      <label class="size">
        <span>Por página</span>
        <select [value]="size()" [disabled]="disabled()" (change)="onSize($event)">
          @for (option of pageSizes(); track option) {
            <option [value]="option" [selected]="option === size()">{{ option }}</option>
          }
        </select>
      </label>
    </nav>
  `,
  styles: `
    .paginator {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.75rem 1rem;
      padding: 0.85rem 0.25rem 0;
      font-size: 0.85rem;
      color: var(--muted);
    }
    .summary {
      margin: 0;
    }
    .summary strong {
      color: var(--text);
      font-variant-numeric: tabular-nums;
    }
    .controls {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .pages {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .nav-btn,
    .page-btn {
      min-width: 34px;
      height: 34px;
      padding: 0 0.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: var(--text);
      font-size: 0.85rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .page-btn.current {
      background: var(--primary);
      border-color: var(--primary);
      color: var(--primary-text);
    }
    .nav-btn:disabled,
    .page-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .prev-icon {
      transform: rotate(90deg);
    }
    .next-icon {
      transform: rotate(-90deg);
    }
    .gap {
      padding: 0 0.15rem;
    }
    .size {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      font-weight: 500;
    }
    .size select {
      width: auto;
      padding: 0.35rem 0.5rem;
    }

    /* Móvil: resumen arriba, controles centrados y sin números intermedios. */
    @media (max-width: 560px) {
      .paginator {
        justify-content: center;
      }
      .summary {
        width: 100%;
        text-align: center;
      }
      .pages li:not(:has(.current)) {
        display: none;
      }
    }
  `,
})
export class PaginatorComponent {
  /** Página actual (desde 0). */
  readonly page = input.required<number>();
  readonly size = input.required<number>();
  readonly totalElements = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageSizes = input<number[]>([10, 20, 50]);
  /** Desactiva los controles mientras se carga una página. */
  readonly disabled = input<boolean>(false);
  readonly label = input<string>('Paginación');

  readonly pageChange = output<number>();
  readonly sizeChange = output<number>();

  protected readonly from = computed(() =>
    this.totalElements() === 0 ? 0 : this.page() * this.size() + 1,
  );
  protected readonly to = computed(() =>
    Math.min((this.page() + 1) * this.size(), this.totalElements()),
  );

  /** Primera, última y hasta 2 vecinas a cada lado de la actual; "…" donde se salten páginas. */
  protected readonly items = computed<PageItem[]>(() => {
    const total = this.totalPages();
    const current = this.page();
    const indexes = new Set<number>([0, total - 1]);
    for (let i = current - 2; i <= current + 2; i++) indexes.add(i);
    const sorted = [...indexes].filter((i) => i >= 0 && i < total).sort((a, b) => a - b);

    const result: PageItem[] = [];
    sorted.forEach((index, n) => {
      if (n > 0 && index - sorted[n - 1] > 1) {
        result.push({ kind: 'gap', key: `gap-${index}` });
      }
      result.push({ kind: 'page', index });
    });
    return result;
  });

  protected go(index: number): void {
    if (index >= 0 && index < this.totalPages() && index !== this.page()) {
      this.pageChange.emit(index);
    }
  }

  protected onSize(event: Event): void {
    this.sizeChange.emit(Number((event.target as HTMLSelectElement).value));
  }
}
