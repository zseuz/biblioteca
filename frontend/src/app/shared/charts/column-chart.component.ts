import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { ChartDatum, ChartUnit, niceTicks, withUnit } from './chart.models';

const MARGIN = { top: 22, right: 8, bottom: 30, left: 34 };
const MAX_BAR = 24; // grosor máximo de columna: el resto de la banda es aire
const RADIUS = 4; // extremo de dato redondeado; la base queda recta
const FALLBACK_WIDTH = 600;

interface Column {
  datum: ChartDatum;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  path: string;
  bandX: number;
  center: number;
  showValue: boolean;
}

/**
 * Gráfica de columnas (una sola serie) para tendencias en el tiempo.
 *
 * <ul>
 *   <li>Ancho adaptable: mide su contenedor con {@code ResizeObserver} y recalcula en px,
 *       así el texto nunca se deforma (a diferencia de escalar un viewBox).</li>
 *   <li>Eje Y con marcas enteras "limpias", cuadrícula de 1px recesiva, columnas de ≤24px con
 *       extremo redondeado y base recta.</li>
 *   <li>Etiquetas directas solo en el máximo y en el último periodo; el resto vive en el
 *       tooltip y en la vista de tabla.</li>
 *   <li>Tooltip al pasar el ratón o al enfocar con el teclado (cada banda es enfocable).</li>
 * </ul>
 */
@Component({
  selector: 'app-column-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (width() > 0) {
      <svg
        [attr.width]="width()"
        [attr.height]="height()"
        role="img"
        [attr.aria-label]="ariaLabel()"
        (pointerleave)="active.set(null)"
      >
        <!-- Cuadrícula y eje Y -->
        @for (t of layout().ticks; track t.value) {
          <line
            [attr.x1]="margin.left"
            [attr.x2]="width() - margin.right"
            [attr.y1]="t.y"
            [attr.y2]="t.y"
            [class]="t.value === 0 ? 'baseline' : 'grid'"
          />
          <text class="tick" [attr.x]="margin.left - 8" [attr.y]="t.y" dy="0.32em" text-anchor="end">
            {{ t.value }}
          </text>
        }

        @for (c of layout().columns; track c.datum.label) {
          <!-- Resalte de la banda activa -->
          @if (active() === c.index) {
            <rect
              class="band-highlight"
              [attr.x]="c.bandX"
              [attr.y]="margin.top"
              [attr.width]="layout().band"
              [attr.height]="layout().plotH"
              rx="6"
            />
          }
          @if (c.height > 0) {
            <path class="column" [class.dim]="active() !== null && active() !== c.index" [attr.d]="c.path" />
          }
          @if (c.showValue) {
            <text class="value" [attr.x]="c.center" [attr.y]="c.y - 6" text-anchor="middle">
              {{ c.datum.count }}
            </text>
          }
          <text
            class="tick x"
            [attr.x]="c.center"
            [attr.y]="height() - margin.bottom + 18"
            text-anchor="middle"
          >
            {{ tickLabel()(c.datum.label) }}
          </text>
          <!-- Zona de interacción: toda la banda, más grande que la columna -->
          <rect
            class="hit"
            [attr.x]="c.bandX"
            [attr.y]="margin.top"
            [attr.width]="layout().band"
            [attr.height]="layout().plotH"
            tabindex="0"
            role="img"
            [attr.aria-label]="fullLabel()(c.datum.label) + ': ' + format(c.datum.count)"
            (pointerenter)="active.set(c.index)"
            (focus)="active.set(c.index)"
            (blur)="active.set(null)"
          />
        }
      </svg>

      @if (tooltip(); as tip) {
        <div class="tooltip" [style.left.px]="tip.left" [style.top.px]="tip.top" aria-hidden="true">
          <strong class="tip-value">{{ format(tip.datum.count) }}</strong>
          <span class="tip-label">{{ fullLabel()(tip.datum.label) }}</span>
        </div>
      }
    }
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      width: 100%;
    }
    svg {
      display: block;
      overflow: visible;
      font-family: inherit;
    }
    .grid {
      stroke: var(--chart-grid);
      stroke-width: 1;
      shape-rendering: crispEdges;
    }
    .baseline {
      stroke: var(--chart-axis);
      stroke-width: 1;
      shape-rendering: crispEdges;
    }
    .tick {
      font-size: 11px;
      fill: var(--muted);
      font-variant-numeric: tabular-nums;
    }
    .tick.x {
      font-variant-numeric: normal;
    }
    .column {
      fill: var(--chart-series);
      transition: opacity 0.15s ease;
    }
    .column.dim {
      opacity: 0.45;
    }
    .value {
      font-size: 12px;
      font-weight: 700;
      fill: var(--text);
    }
    .band-highlight {
      fill: var(--surface-subtle);
    }
    .hit {
      fill: transparent;
      cursor: default;
      outline: none;
    }
    .hit:focus-visible {
      stroke: var(--primary);
      stroke-width: 2;
    }
    .tooltip {
      position: absolute;
      transform: translate(-50%, calc(-100% - 10px));
      pointer-events: none;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-lg);
      padding: 0.45rem 0.65rem;
      display: flex;
      flex-direction: column;
      white-space: nowrap;
      z-index: 2;
    }
    .tip-value {
      font-size: 0.9rem;
      color: var(--text);
    }
    .tip-label {
      font-size: 0.75rem;
      color: var(--muted);
    }
  `,
})
export class ColumnChartComponent {
  readonly data = input.required<ChartDatum[]>();
  readonly unit = input<ChartUnit>({ one: 'elemento', many: 'elementos' });
  /** Texto corto bajo cada columna (p. ej. "oct"). */
  readonly tickLabel = input<(label: string) => string>((l) => l);
  /** Texto completo para tooltip y lectores de pantalla (p. ej. "octubre de 2026"). */
  readonly fullLabel = input<(label: string) => string>((l) => l);
  readonly height = input<number>(240);
  readonly ariaLabel = input<string>('Gráfica de columnas');

  protected readonly margin = MARGIN;
  protected readonly width = signal(0);
  protected readonly active = signal<number | null>(null);

  protected readonly layout = computed(() => {
    const data = this.data();
    const plotW = Math.max(0, this.width() - MARGIN.left - MARGIN.right);
    const plotH = this.height() - MARGIN.top - MARGIN.bottom;
    const base = MARGIN.top + plotH;
    const ticksValues = niceTicks(Math.max(...data.map((d) => d.count), 0));
    const yMax = ticksValues[ticksValues.length - 1];
    const band = data.length ? plotW / data.length : 0;
    const barW = Math.min(MAX_BAR, band * 0.56);

    // Etiqueta directa: el máximo (primera aparición) y el periodo actual (último).
    const maxIndex = data.reduce((best, d, i) => (d.count > data[best].count ? i : best), 0);

    const columns: Column[] = data.map((datum, index) => {
      const height = yMax ? (datum.count / yMax) * plotH : 0;
      const bandX = MARGIN.left + band * index;
      const x = bandX + (band - barW) / 2;
      const y = base - height;
      const r = Math.min(RADIUS, height, barW / 2);
      const path =
        `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} ` +
        `H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${base} Z`;
      const showValue = datum.count > 0 && (index === maxIndex || index === data.length - 1);
      return { datum, index, x, y, width: barW, height, path, bandX, center: bandX + band / 2, showValue };
    });

    const ticks = ticksValues.map((value) => ({ value, y: base - (yMax ? (value / yMax) * plotH : 0) }));
    return { columns, ticks, band, plotH };
  });

  protected readonly tooltip = computed(() => {
    const i = this.active();
    if (i === null) return null;
    const c = this.layout().columns[i];
    if (!c) return null;
    // Se mantiene dentro del ancho del gráfico aunque la columna esté en un extremo.
    const left = Math.min(Math.max(c.center, 70), this.width() - 70);
    return { datum: c.datum, left, top: Math.min(c.y, MARGIN.top + this.layout().plotH - 4) };
  });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    // Entornos sin ResizeObserver (tests con jsdom, SSR): ancho fijo razonable.
    if (typeof ResizeObserver === 'undefined') {
      this.width.set(FALLBACK_WIDTH);
      return;
    }
    // Medida inicial inmediata tras el primer render (sin esperar al primer fotograma pintado);
    // ResizeObserver se encarga de los cambios de tamaño posteriores.
    afterNextRender(() => this.width.set(Math.floor(host.getBoundingClientRect().width)));
    const observer = new ResizeObserver(([entry]) => this.width.set(Math.floor(entry.contentRect.width)));
    observer.observe(host);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  protected format(count: number): string {
    return withUnit(count, this.unit());
  }
}
