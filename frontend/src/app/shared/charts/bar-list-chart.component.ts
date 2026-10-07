import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartDatum, ChartUnit, percentOf, withUnit } from './chart.models';

/**
 * Gráfica de barras horizontales para rankings y distribuciones (una sola serie).
 *
 * <p>Horizontal porque las categorías tienen nombres largos (títulos, personas) que así se
 * leen completos. Cada barra es del mismo color (una serie = un color; nunca una rampa por
 * tamaño), crece desde la misma línea base, mide 10px y tiene el extremo redondeado.
 *
 * <p>Todos los valores van etiquetados directamente (son pocos), por lo que la información
 * nunca depende del hover; al pasar el ratón o enfocar la fila solo se resalta.
 */
@Component({
  selector: 'app-bar-list-chart',
  // OnPush: Angular solo vuelve a pintar este componente cuando cambian sus entradas o sus signals.
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="bars" [attr.aria-label]="ariaLabel()">
      @for (row of rows(); track row.datum.label; let i = $index) {
        <li class="row" tabindex="0" [attr.aria-label]="row.aria">
          <div class="head">
            @if (ranked()) {
              <span class="rank" aria-hidden="true">{{ i + 1 }}</span>
            }
            <span class="label" [title]="row.datum.label">{{ row.datum.label }}</span>
            <span class="value" aria-hidden="true">
              <strong>{{ row.datum.count }}</strong>
              @if (showShare()) {
                <span class="share">{{ row.share }}%</span>
              }
            </span>
          </div>
          <div class="track" aria-hidden="true">
            <div class="bar" [style.width.%]="row.width"></div>
          </div>
        </li>
      }
    </ol>
  `,
  styles: `
    :host {
      display: block;
    }
    .bars {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .row {
      padding: 0.45rem 0.5rem;
      margin: 0 -0.5rem;
      border-radius: var(--radius-sm);
      outline: none;
      transition: background-color 0.15s ease;
    }
    .row:hover,
    .row:focus-visible {
      background: var(--surface-subtle);
    }
    .row:focus-visible {
      box-shadow: inset 0 0 0 2px var(--primary);
    }
    .head {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      margin-bottom: 0.4rem;
    }
    .rank {
      flex-shrink: 0;
      width: 1.1rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--muted);
      font-variant-numeric: tabular-nums;
    }
    .label {
      flex: 1;
      min-width: 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .value {
      flex-shrink: 0;
      font-size: 0.85rem;
      color: var(--text);
      font-variant-numeric: tabular-nums;
    }
    .share {
      margin-left: 0.35rem;
      font-size: 0.75rem;
      color: var(--muted);
    }
    /* Sin pista de fondo: la barra es el único "ink" del dato. */
    .track {
      height: 10px;
    }
    .bar {
      height: 100%;
      min-width: 3px;
      background: var(--chart-series);
      border-radius: 0 4px 4px 0; /* base recta, extremo redondeado */
      transition: width 0.45s cubic-bezier(0.16, 1, 0.3, 1);
    }
  `,
})
export class BarListChartComponent {
  /** Filas a dibujar (etiqueta y valor), ya ordenadas por el servidor. */
  readonly data = input.required<ChartDatum[]>();
  /** Unidad de los valores, para las etiquetas y los lectores de pantalla. */
  readonly unit = input<ChartUnit>({ one: 'elemento', many: 'elementos' });
  /** Muestra la posición (1, 2, 3...) delante de cada etiqueta. */
  readonly ranked = input<boolean>(false);
  /** Muestra el porcentaje sobre el total de la serie. */
  readonly showShare = input<boolean>(false);
  /** Descripción de la gráfica para lectores de pantalla. */
  readonly ariaLabel = input<string>('Gráfica de barras');

  /** Cada fila con el ancho de su barra relativo al valor máximo (la mayor ocupa el 100 %). */
  protected readonly rows = computed(() => {
    const data = this.data();
    const max = Math.max(...data.map((d) => d.count), 1);
    const total = data.reduce((sum, d) => sum + d.count, 0);
    return data.map((datum) => {
      const share = percentOf(datum.count, total);
      const aria = `${datum.label}: ${withUnit(datum.count, this.unit())}` + (this.showShare() ? `, ${share}%` : '');
      return { datum, width: (datum.count / max) * 100, share, aria };
    });
  });
}
