import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartDatum, percentOf } from './chart.models';

/**
 * Vista de tabla equivalente a una gráfica. Es la alternativa accesible (WCAG): todos los
 * valores son legibles sin depender del color, del hover ni de la vista.
 */
@Component({
  selector: 'app-chart-table',
  // OnPush: Angular solo vuelve a pintar este componente cuando cambian sus entradas o sus signals.
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table class="chart-table">
      <caption class="sr-only">{{ caption() }}</caption>
      <thead>
        <tr>
          <th scope="col">{{ labelHeader() }}</th>
          <th scope="col" class="num">{{ valueHeader() }}</th>
          @if (showShare()) {
            <th scope="col" class="num">%</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (d of data(); track d.label) {
          <tr>
            <td>{{ formatLabel()(d.label) }}</td>
            <td class="num">{{ d.count }}</td>
            @if (showShare()) {
              <td class="num">{{ share(d.count) }}%</td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    :host {
      display: block;
    }
    .chart-table {
      width: 100%;
      font-size: 0.875rem;
    }
    .chart-table th,
    .chart-table td {
      white-space: normal;
      padding: 0.5rem 0.6rem;
    }
    .chart-table td:first-child {
      text-transform: none;
    }
    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class ChartTableComponent {
  /** Los mismos datos que la gráfica, mostrados como tabla (alternativa accesible). */
  readonly data = input.required<ChartDatum[]>();
  /** Títulos de la tabla y de sus dos columnas. */
  readonly caption = input<string>('Datos de la gráfica');
  readonly labelHeader = input<string>('Categoría');
  readonly valueHeader = input<string>('Cantidad');
  /** Añade una columna con el porcentaje de cada fila sobre el total. */
  readonly showShare = input<boolean>(false);
  /** Función para mostrar la etiqueta, p. ej. «2026-10» → «Octubre 2026». */
  readonly formatLabel = input<(label: string) => string>((l) => l);

  /** Suma de todos los valores (base de los porcentajes). */
  private readonly total = computed(() => this.data().reduce((sum, d) => sum + d.count, 0));

  /** Porcentaje de una fila sobre el total. */
  protected share(count: number): number {
    return percentOf(count, this.total());
  }
}
