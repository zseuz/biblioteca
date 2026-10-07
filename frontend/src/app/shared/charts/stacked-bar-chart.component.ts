import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { IconComponent, IconName } from '../icon.component';
import { percentOf } from './chart.models';

/** Segmento de una {@link StackedBarChartComponent}. */
export interface StackedSegment {
  key: string;
  label: string;
  count: number;
  /** Color de la marca como variable CSS, p. ej. {@code var(--chart-good)}. */
  color: string;
  /** Icono que acompaña al color en la leyenda: el estado nunca depende solo del color. */
  icon: IconName;
}

/**
 * Barra apilada al 100 % para mostrar partes de un todo (p. ej. estado de los préstamos).
 *
 * <p>Se prefiere a un gráfico de dona porque comparar longitudes sobre una misma línea es más
 * preciso que comparar ángulos. Los segmentos se separan con un hueco de 2px del color de la
 * superficie (no con bordes), y la leyenda —siempre visible— repite cada valor y porcentaje,
 * así que el tooltip solo complementa.
 */
@Component({
  selector: 'app-stacked-bar-chart',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="total">
      <span class="total-value">{{ total().toLocaleString('es') }}</span>
      <span class="total-label">{{ totalLabel() }}</span>
    </div>

    <div class="bar-wrap">
      <div class="bar" role="img" [attr.aria-label]="ariaLabel()" (pointerleave)="active.set(null)">
        @for (s of visible(); track s.key) {
          <div
            class="segment"
            [class.dim]="active() !== null && active() !== s.key"
            [style.flex-grow]="s.count"
            [style.background]="s.color"
            (pointerenter)="active.set(s.key)"
          ></div>
        }
        @if (total() === 0) {
          <div class="segment empty"></div>
        }
      </div>
      @if (activeSegment(); as s) {
        <div class="tooltip" aria-hidden="true">
          <strong>{{ s.count }} · {{ s.share }}%</strong>
          <span>{{ s.label }}</span>
        </div>
      }
    </div>

    <ul class="legend">
      @for (s of withShare(); track s.key) {
        <li
          class="legend-row"
          tabindex="0"
          [attr.aria-label]="s.label + ': ' + s.count + ' (' + s.share + '%)'"
          (pointerenter)="active.set(s.key)"
          (pointerleave)="active.set(null)"
          (focus)="active.set(s.key)"
          (blur)="active.set(null)"
        >
          <span class="swatch" [style.background]="s.color" aria-hidden="true"></span>
          <app-icon [name]="s.icon" [size]="14" class="legend-icon" aria-hidden="true" />
          <span class="legend-label">{{ s.label }}</span>
          <strong class="legend-count">{{ s.count }}</strong>
          <span class="legend-share">{{ s.share }}%</span>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
    }
    .total {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      margin-bottom: 0.85rem;
    }
    .total-value {
      font-size: 2rem;
      font-weight: 800;
      line-height: 1;
      color: var(--text);
    }
    .total-label {
      font-size: 0.85rem;
      color: var(--muted);
    }
    .bar-wrap {
      position: relative;
      margin-bottom: 1.1rem;
    }
    .bar {
      display: flex;
      gap: 2px; /* hueco del color de la superficie entre segmentos */
      height: 14px;
    }
    .segment {
      min-width: 4px;
      transition: opacity 0.15s ease;
    }
    .segment:first-child {
      border-radius: 4px 0 0 4px;
    }
    .segment:last-child {
      border-radius: 0 4px 4px 0;
    }
    .segment:only-child {
      border-radius: 4px;
    }
    .segment.dim {
      opacity: 0.35;
    }
    .segment.empty {
      flex-grow: 1;
      background: var(--chart-grid);
    }
    .tooltip {
      position: absolute;
      right: 0;
      bottom: calc(100% + 8px);
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      padding: 0.4rem 0.6rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-lg);
      font-size: 0.75rem;
      color: var(--muted);
      pointer-events: none;
      white-space: nowrap;
    }
    .tooltip strong {
      font-size: 0.875rem;
      color: var(--text);
    }
    .legend {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .legend-row {
      display: grid;
      grid-template-columns: 10px 16px 1fr auto 3rem;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.5rem;
      margin: 0 -0.5rem;
      border-radius: var(--radius-sm);
      outline: none;
      font-size: 0.875rem;
    }
    .legend-row:hover,
    .legend-row:focus-visible {
      background: var(--surface-subtle);
    }
    .legend-row:focus-visible {
      box-shadow: inset 0 0 0 2px var(--primary);
    }
    .swatch {
      width: 10px;
      height: 10px;
      border-radius: 2px;
    }
    .legend-icon {
      color: var(--muted);
    }
    .legend-label {
      color: var(--text);
    }
    .legend-count {
      color: var(--text);
      font-variant-numeric: tabular-nums;
    }
    .legend-share {
      text-align: right;
      color: var(--muted);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class StackedBarChartComponent {
  readonly segments = input.required<StackedSegment[]>();
  readonly totalLabel = input<string>('en total');
  readonly ariaLabel = input<string>('Distribución');

  protected readonly active = signal<string | null>(null);
  protected readonly total = computed(() => this.segments().reduce((sum, s) => sum + s.count, 0));
  protected readonly withShare = computed(() =>
    this.segments().map((s) => ({ ...s, share: percentOf(s.count, this.total()) })),
  );
  /** Solo los segmentos con valor ocupan espacio en la barra. */
  protected readonly visible = computed(() => this.withShare().filter((s) => s.count > 0));
  protected readonly activeSegment = computed(
    () => this.withShare().find((s) => s.key === this.active()) ?? null,
  );
}
