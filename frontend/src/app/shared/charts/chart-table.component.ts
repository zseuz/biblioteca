import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartDatum, percentOf } from './chart.models';

/**
 * Vista de tabla equivalente a una gráfica. Es la alternativa accesible (WCAG): todos los
 * valores son legibles sin depender del color, del hover ni de la vista.
 */
@Component({
  selector: 'app-chart-table',
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
  readonly data = input.required<ChartDatum[]>();
  readonly caption = input<string>('Datos de la gráfica');
  readonly labelHeader = input<string>('Categoría');
  readonly valueHeader = input<string>('Cantidad');
  readonly showShare = input<boolean>(false);
  readonly formatLabel = input<(label: string) => string>((l) => l);

  private readonly total = computed(() => this.data().reduce((sum, d) => sum + d.count, 0));

  protected share(count: number): number {
    return percentOf(count, this.total());
  }
}
